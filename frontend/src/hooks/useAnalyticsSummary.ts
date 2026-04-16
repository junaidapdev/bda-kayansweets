import { useMemo } from 'react'
import type { ICreditNoteWithSupplier } from '../interfaces/ICreditNote'
import type { RebateLayer } from '../constants/bdaRules'

// ── Summary cards data ──────────────────────────────────

export interface AnalyticsTotals {
  totalExpected: number
  totalReceived: number
  totalPending: number  // count of pending status
  totalLeakage: number  // expected - received (across all)
}

// ── Per-type leakage breakdown ──────────────────────────

export interface LeakageByType {
  type: RebateLayer
  label: string
  expected: number
  received: number
  leakage: number
  count: number
}

// ── Supplier performance ────────────────────────────────

export interface SupplierPerformance {
  supplierId: string
  supplierName: string
  expected: number
  received: number
  leakage: number
  leakagePercent: number
  noteCount: number
}

// ── Full analytics result ───────────────────────────────

export interface AnalyticsSummary {
  totals: AnalyticsTotals
  leakageByType: LeakageByType[]
  supplierPerformance: SupplierPerformance[]
}

const TYPE_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly_bonus: 'Quarterly Bonus',
  yearly: 'Yearly',
  rent: 'Rent',
}

/**
 * Computes all analytics metrics from the same credit notes data
 * used by the Accounts page — single source of truth.
 */
export function useAnalyticsSummary(creditNotes: ICreditNoteWithSupplier[]): AnalyticsSummary {
  return useMemo(() => {
    // ── Totals ────────────────────────────────────────
    let totalExpected = 0
    let totalReceived = 0
    let totalPending = 0

    // ── Per-type accumulators ─────────────────────────
    const typeMap = new Map<string, { expected: number; received: number; count: number }>()

    // ── Per-supplier accumulators ─────────────────────
    const supplierMap = new Map<string, {
      name: string
      expected: number
      received: number
      count: number
    }>()

    for (const note of creditNotes) {
      const exp = note.expected_amount
      const rcv = note.received_amount

      totalExpected += exp
      totalReceived += rcv
      if (note.status === 'pending') totalPending++

      // Per type
      const existing = typeMap.get(note.rebate_type)
      if (existing) {
        existing.expected += exp
        existing.received += rcv
        existing.count++
      } else {
        typeMap.set(note.rebate_type, { expected: exp, received: rcv, count: 1 })
      }

      // Per supplier
      const sid = note.supplier_id
      const sExisting = supplierMap.get(sid)
      if (sExisting) {
        sExisting.expected += exp
        sExisting.received += rcv
        sExisting.count++
      } else {
        supplierMap.set(sid, {
          name: note.suppliers?.name ?? '—',
          expected: exp,
          received: rcv,
          count: 1,
        })
      }
    }

    // ── Build leakage by type ─────────────────────────
    const typeOrder: RebateLayer[] = ['monthly', 'quarterly_bonus', 'yearly', 'rent']
    const leakageByType: LeakageByType[] = typeOrder
      .map((type) => {
        const data = typeMap.get(type)
        if (!data) return null
        return {
          type,
          label: TYPE_LABELS[type] ?? type,
          expected: data.expected,
          received: data.received,
          leakage: data.expected - data.received,
          count: data.count,
        }
      })
      .filter((x): x is LeakageByType => x !== null)

    // ── Build supplier performance ────────────────────
    const supplierPerformance: SupplierPerformance[] = Array.from(supplierMap.entries())
      .map(([supplierId, data]) => ({
        supplierId,
        supplierName: data.name,
        expected: data.expected,
        received: data.received,
        leakage: data.expected - data.received,
        leakagePercent: data.expected > 0 ? ((data.expected - data.received) / data.expected) * 100 : 0,
        noteCount: data.count,
      }))
      .sort((a, b) => b.leakage - a.leakage) // worst leakage first

    return {
      totals: {
        totalExpected,
        totalReceived,
        totalPending,
        totalLeakage: totalExpected - totalReceived,
      },
      leakageByType,
      supplierPerformance,
    }
  }, [creditNotes])
}
