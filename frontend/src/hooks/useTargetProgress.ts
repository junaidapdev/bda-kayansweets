import { useCallback, useEffect, useState } from 'react'
import { format, startOfMonth, startOfQuarter } from 'date-fns'
import supabase from '../lib/supabaseClient'
import { successResponse, errorResponse, type ApiResponse } from '../lib/apiResponse'
import { ERROR_MESSAGES } from '../constants/errorMessages'
import type { ISupplier } from '../interfaces/ISupplier'
import type { IPurchaseOrder } from '../interfaces/IPurchaseOrder'
import { computeStackedBDA, getQuarter, type PeriodPurchases, type StackedBDAResult } from '../lib/bdaCalculator'
import logger from '../lib/logger'

export interface TargetProgress {
  supplier: ISupplier
  year: number
  purchases: PeriodPurchases
  bda: StackedBDAResult
  /** Per-period progress as percentage of target (0 if no target set). */
  monthlyProgressPercent: number
  quarterlyProgressPercent: number
  yearlyProgressPercent: number
}

async function fetchProgressForSuppliers(
  suppliers: ISupplier[],
): Promise<ApiResponse<TargetProgress[]>> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const _currentQuarter = getQuarter(currentMonth) // used by future target alerts
  void _currentQuarter
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const quarterStart = format(startOfQuarter(now), 'yyyy-MM-dd')

  // Fetch ALL purchase orders (no date filter — we group by year)
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('supplier_id, purchase_amount, order_date')

  if (error) {
    logger.error('useTargetProgress fetch', error)
    return errorResponse(ERROR_MESSAGES.TARGET_LOAD_FAILED)
  }

  const rows = data as Pick<IPurchaseOrder, 'supplier_id' | 'purchase_amount' | 'order_date'>[]

  // Build buckets: key = `${supplierId}_${year}`
  interface YearBucket {
    monthly: number
    quarterly: number
    yearly: number
    quarterlyBreakdown: [number, number, number, number]
    monthlyBreakdown: number[]
  }

  const bucketMap = new Map<string, YearBucket>()
  const supplierYears = new Map<string, Set<number>>()

  for (const r of rows) {
    const sid = r.supplier_id
    const amt = Number(r.purchase_amount)
    const orderDate = new Date(r.order_date)
    const orderYear = orderDate.getFullYear()
    const orderMonth = orderDate.getMonth()
    const orderQuarter = getQuarter(orderMonth)
    const key = `${sid}_${orderYear}`

    if (!supplierYears.has(sid)) supplierYears.set(sid, new Set())
    supplierYears.get(sid)!.add(orderYear)

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

    if (orderYear === currentYear) {
      if (r.order_date >= monthStart) bucket.monthly += amt
      if (r.order_date >= quarterStart) bucket.quarterly += amt
    }
  }

  const results: TargetProgress[] = []

  for (const supplier of suppliers) {
    const years = supplierYears.get(supplier.id) ?? new Set<number>()
    years.add(currentYear)

    for (const year of years) {
      const key = `${supplier.id}_${year}`
      const bucket = bucketMap.get(key)
      const rules = supplier.rebate_rules

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

      const bda = computeStackedBDA(purchases, rules, year)

      results.push({
        supplier,
        year,
        purchases,
        bda,
        monthlyProgressPercent:
          (rules.monthly_target ?? 0) > 0
            ? (purchases.monthly / (rules.monthly_target ?? 1)) * 100
            : 0,
        quarterlyProgressPercent:
          (rules.quarterly_target ?? 0) > 0
            ? (purchases.quarterly / (rules.quarterly_target ?? 1)) * 100
            : 0,
        yearlyProgressPercent:
          (rules.yearly_target ?? 0) > 0
            ? (purchases.yearly / (rules.yearly_target ?? 1)) * 100
            : 0,
      })
    }
  }

  // Sort: current year first, then descending
  results.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return a.supplier.name.localeCompare(b.supplier.name)
  })

  return successResponse(results)
}

export function useTargetProgress(suppliers: ISupplier[]) {
  const [progress, setProgress] = useState<TargetProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (suppliers.length === 0) {
      setLoading(false)
      return
    }
    setLoading(true)
    const result = await fetchProgressForSuppliers(suppliers)
    if (result.success && result.data) {
      setProgress(result.data)
      setError(null)
    } else {
      setError(result.error ?? ERROR_MESSAGES.UNKNOWN)
    }
    setLoading(false)
  }, [suppliers])

  useEffect(() => { load() }, [load])

  return { progress, loading, error, reload: load }
}
