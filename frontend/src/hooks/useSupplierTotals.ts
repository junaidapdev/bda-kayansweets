import { useMemo } from 'react'
import type { IPurchaseOrderWithSupplier } from '../interfaces/IPurchaseOrder'
import type { ISupplier } from '../interfaces/ISupplier'
import { computeStackedBDA, getQuarter, type PeriodPurchases, type StackedBDAResult } from '../lib/bdaCalculator'

export interface SupplierTotal {
  supplier: ISupplier
  year: number
  purchases: PeriodPurchases
  allTimePurchases: number
  bda: StackedBDAResult
}

/**
 * Aggregates purchase orders per supplier PER YEAR into monthly, quarterly,
 * yearly totals + per-quarter breakdown, then runs the rebate calculator.
 *
 * Each year is treated independently — a new year resets all progress.
 * Results are sorted: current year first, then descending.
 */
export function useSupplierTotals(
  orders: IPurchaseOrderWithSupplier[],
  suppliers: ISupplier[],
): SupplierTotal[] {
  return useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const currentQuarter = getQuarter(currentMonth)

    // Key = `${supplierId}_${year}`
    interface YearBucket {
      monthly: number
      quarterly: number
      yearly: number
      quarterlyBreakdown: [number, number, number, number]
      monthlyBreakdown: number[]
    }

    const bucketMap = new Map<string, YearBucket>()
    const allTimeMap = new Map<string, number>()
    const supplierYears = new Map<string, Set<number>>()

    for (const order of orders) {
      const sid = order.supplier_id
      const amt = Number(order.purchase_amount)
      const orderDate = new Date(order.order_date)
      const orderYear = orderDate.getFullYear()
      const orderMonth = orderDate.getMonth()
      const orderQuarter = getQuarter(orderMonth)
      const key = `${sid}_${orderYear}`

      // Track all-time totals per supplier
      allTimeMap.set(sid, (allTimeMap.get(sid) ?? 0) + amt)

      // Track which years each supplier has data for
      if (!supplierYears.has(sid)) supplierYears.set(sid, new Set())
      supplierYears.get(sid)!.add(orderYear)

      // Create bucket if needed
      if (!bucketMap.has(key)) {
        bucketMap.set(key, {
          monthly: 0,
          quarterly: 0,
          yearly: 0,
          quarterlyBreakdown: [0, 0, 0, 0],
          monthlyBreakdown: Array(12).fill(0) as number[],
        })
      }

      const bucket = bucketMap.get(key)!
      bucket.yearly += amt
      bucket.quarterlyBreakdown[orderQuarter - 1] += amt
      bucket.monthlyBreakdown[orderMonth] += amt

      // "monthly" and "quarterly" only meaningful for the current year
      // (for past years they stay 0 — the breakdowns hold all the data)
      if (orderYear === currentYear) {
        if (orderMonth === currentMonth) bucket.monthly += amt
        if (orderQuarter === currentQuarter) bucket.quarterly += amt
      }
    }

    // Build results: one entry per supplier per year
    const results: SupplierTotal[] = []

    for (const supplier of suppliers) {
      const years = supplierYears.get(supplier.id) ?? new Set<number>()
      // Always include the current year even if no purchases yet
      years.add(currentYear)

      for (const year of years) {
        const key = `${supplier.id}_${year}`
        const bucket = bucketMap.get(key)

        const purchases: PeriodPurchases = bucket
          ? {
              monthly: bucket.monthly,
              quarterly: bucket.quarterly,
              yearly: bucket.yearly,
              quarterlyBreakdown: bucket.quarterlyBreakdown,
              monthlyBreakdown: bucket.monthlyBreakdown,
            }
          : {
              monthly: 0,
              quarterly: 0,
              yearly: 0,
              quarterlyBreakdown: [0, 0, 0, 0],
              monthlyBreakdown: Array(12).fill(0) as number[],
            }

        const bda = computeStackedBDA(purchases, supplier.rebate_rules, year)

        results.push({
          supplier,
          year,
          purchases,
          allTimePurchases: allTimeMap.get(supplier.id) ?? 0,
          bda,
        })
      }
    }

    // Sort: current year first, then descending by year; within same year, alphabetical
    results.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return a.supplier.name.localeCompare(b.supplier.name)
    })

    return results
  }, [orders, suppliers])
}
