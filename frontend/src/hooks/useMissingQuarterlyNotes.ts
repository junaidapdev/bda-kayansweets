import { useMemo } from 'react'
import type { IPurchaseOrderWithSupplier } from '../interfaces/IPurchaseOrder'
import type { ICreditNoteWithSupplier } from '../interfaces/ICreditNote'
import type { ISupplier } from '../interfaces/ISupplier'
import { computeLayerAmount } from '../lib/bdaCalculator'

export interface MissingQuarterlyNote {
  supplierId: string
  supplierName: string
  year: number
  quarter: number // 1–4
  periodStart: string
  periodEnd: string
  totalPurchases: number
  expectedAmount: number
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * Detects complete quarters that are missing a quarterly_bonus credit note.
 *
 * Logic:
 * 1. Group purchase orders by supplier + year + quarter
 * 2. For each group, check if all 3 months of the quarter have data
 * 3. Cross-reference with existing credit notes (rebate_type = 'quarterly_bonus')
 * 4. Return suggestions for missing ones
 */
export function useMissingQuarterlyNotes(
  orders: IPurchaseOrderWithSupplier[],
  creditNotes: ICreditNoteWithSupplier[],
  suppliers: ISupplier[],
): MissingQuarterlyNote[] {
  return useMemo(() => {
    if (orders.length === 0 || suppliers.length === 0) return []

    const supplierMap = new Map(suppliers.map((s) => [s.id, s]))

    // ── Step 1: Group purchases by supplier + year + quarter ──
    // Track which months have data per group
    const groups = new Map<string, { months: Set<number>; total: number; supplierId: string; year: number; quarter: number }>()

    for (const order of orders) {
      const date = new Date(order.order_date + 'T00:00:00')
      const year = date.getFullYear()
      const month = date.getMonth() // 0-11
      const quarter = Math.floor(month / 3) + 1
      const key = `${order.supplier_id}_${year}_Q${quarter}`

      let group = groups.get(key)
      if (!group) {
        group = { months: new Set(), total: 0, supplierId: order.supplier_id, year, quarter }
        groups.set(key, group)
      }
      group.months.add(month)
      group.total += Number(order.purchase_amount)
    }

    // ── Step 2: Build set of existing quarterly credit notes ──
    const existingKeys = new Set<string>()
    for (const cn of creditNotes) {
      if (cn.rebate_type !== 'quarterly_bonus') continue
      // Extract quarter from period_start date
      const startDate = new Date(cn.period_start + 'T00:00:00')
      const year = startDate.getFullYear()
      const quarter = Math.floor(startDate.getMonth() / 3) + 1
      existingKeys.add(`${cn.supplier_id}_${year}_Q${quarter}`)
    }

    // ── Step 3: Find complete quarters without credit notes ──
    const missing: MissingQuarterlyNote[] = []

    for (const [key, group] of groups) {
      // Quarter must be complete (all 3 months have data)
      const startMonth = (group.quarter - 1) * 3
      const hasAll3 = [0, 1, 2].every((offset) => group.months.has(startMonth + offset))
      if (!hasAll3) continue

      // Skip if credit note already exists
      if (existingKeys.has(key)) continue

      // Skip if supplier has no quarterly_bonus_rate
      const supplier = supplierMap.get(group.supplierId)
      if (!supplier) continue
      if (!supplier.rebate_rules.quarterly_bonus_rate || supplier.rebate_rules.quarterly_bonus_rate <= 0) continue

      const endMonth = startMonth + 2
      const lastDay = new Date(group.year, endMonth + 1, 0).getDate()

      missing.push({
        supplierId: group.supplierId,
        supplierName: supplier.name,
        year: group.year,
        quarter: group.quarter,
        periodStart: `${group.year}-${pad2(startMonth + 1)}-01`,
        periodEnd: `${group.year}-${pad2(endMonth + 1)}-${pad2(lastDay)}`,
        totalPurchases: group.total,
        expectedAmount: computeLayerAmount(group.total, 'quarterly_bonus', supplier.rebate_rules),
      })
    }

    // Sort: most recent first
    missing.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      if (a.quarter !== b.quarter) return b.quarter - a.quarter
      return a.supplierName.localeCompare(b.supplierName)
    })

    return missing
  }, [orders, creditNotes, suppliers])
}
