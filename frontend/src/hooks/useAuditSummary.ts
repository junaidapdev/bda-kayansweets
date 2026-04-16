import { useMemo } from 'react'
import type { ICreditNoteWithSupplier } from '../interfaces/ICreditNote'
import { CREDIT_NOTE_STATUS } from '../constants/appConstants'

export interface AuditSummary {
  totalExpected: number
  totalReceived: number
  netLeakage: number
  countPending: number
  countDisputed: number
}

/**
 * Deduplicates credit notes by (supplier_id + rebate_type + period_start + period_end).
 * If duplicates exist (legacy data), keeps the most recent one (by created_at).
 * This is a safety net — the DB unique constraint and frontend checks should prevent new dupes.
 */
function deduplicateCreditNotes(notes: ICreditNoteWithSupplier[]): ICreditNoteWithSupplier[] {
  const map = new Map<string, ICreditNoteWithSupplier>()
  for (const note of notes) {
    const key = `${note.supplier_id}|${note.rebate_type}|${note.period_start}|${note.period_end}`
    const existing = map.get(key)
    if (!existing || note.created_at > existing.created_at) {
      map.set(key, note)
    }
  }
  return Array.from(map.values())
}

export function useAuditSummary(creditNotes: ICreditNoteWithSupplier[]): AuditSummary {
  return useMemo(() => {
    const unique = deduplicateCreditNotes(creditNotes)

    let totalExpected = 0
    let totalReceived = 0
    let countPending = 0
    let countDisputed = 0

    for (const note of unique) {
      totalExpected += note.expected_amount
      totalReceived += note.received_amount
      if (note.status === CREDIT_NOTE_STATUS.PENDING) countPending++
      if (note.status === CREDIT_NOTE_STATUS.DISPUTED) countDisputed++
    }

    return {
      totalExpected,
      totalReceived,
      netLeakage: totalExpected - totalReceived,
      countPending,
      countDisputed,
    }
  }, [creditNotes])
}
