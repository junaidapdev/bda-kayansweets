import { useCallback, useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { successResponse, errorResponse, type ApiResponse } from '../lib/apiResponse'
import { ERROR_MESSAGES } from '../constants/errorMessages'
import { HTTP_STATUS } from '../constants/httpStatusCodes'
import type { ICreditNote, ICreditNoteWithSupplier } from '../interfaces/ICreditNote'
import type { IPurchaseOrder } from '../interfaces/IPurchaseOrder'
import type { RebateLayer } from '../constants/bdaRules'
import logger from '../lib/logger'

export interface CreditNoteCreateData {
  supplier_id: string
  rebate_type: RebateLayer
  period_start: string
  period_end: string
  expected_amount: number
  received_amount: number
  status: 'pending' | 'received' | 'disputed'
}

export function useCreditNotes() {
  const [creditNotes, setCreditNotes] = useState<ICreditNoteWithSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await fetchCreditNotes()
    if (result.success && result.data) {
      setCreditNotes(result.data)
      setError(null)
    } else {
      setError(result.error ?? ERROR_MESSAGES.UNKNOWN)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const create = useCallback(async (
    formData: CreditNoteCreateData,
  ): Promise<ApiResponse<ICreditNote>> => {
    const result = await createCreditNote(formData)
    if (result.success) await load()
    return result
  }, [load])

  const update = useCallback(async (
    id: string,
    data: Partial<CreditNoteCreateData>,
  ): Promise<ApiResponse<ICreditNote>> => {
    const result = await updateCreditNote(id, data)
    if (result.success) await load()
    return result
  }, [load])

  const softDelete = useCallback(async (id: string): Promise<ApiResponse<null>> => {
    const result = await softDeleteCreditNote(id)
    if (result.success) await load()
    return result
  }, [load])

  return { creditNotes, loading, error, create, update, softDelete, reload: load }
}

/**
 * Fetches purchase total for a supplier in a date range.
 * Exposed so CreditNoteModal can show purchase totals before saving.
 */
export async function fetchPeriodPurchaseTotal(
  supplierId: string,
  periodStart: string,
  periodEnd: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('purchase_amount')
    .eq('supplier_id', supplierId)
    .gte('order_date', periodStart)
    .lte('order_date', periodEnd)

  if (error) {
    logger.error('fetchPeriodPurchaseTotal', error)
    return 0
  }

  return (data as Pick<IPurchaseOrder, 'purchase_amount'>[])
    .reduce((sum, row) => sum + Number(row.purchase_amount), 0)
}

/**
 * Fetches purchase total AND the number of distinct months with data
 * for a supplier in a date range. Used by CreditNoteModal to check
 * whether a quarterly/yearly period is complete.
 */
export async function fetchPeriodPurchaseData(
  supplierId: string,
  periodStart: string,
  periodEnd: string,
): Promise<{ total: number; monthsWithData: number }> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('purchase_amount, order_date')
    .eq('supplier_id', supplierId)
    .gte('order_date', periodStart)
    .lte('order_date', periodEnd)

  if (error) {
    logger.error('fetchPeriodPurchaseData', error)
    return { total: 0, monthsWithData: 0 }
  }

  const rows = data as Pick<IPurchaseOrder, 'purchase_amount' | 'order_date'>[]
  let total = 0
  const monthSet = new Set<string>()

  for (const row of rows) {
    total += Number(row.purchase_amount)
    monthSet.add(row.order_date.substring(0, 7)) // "2026-01"
  }

  return { total, monthsWithData: monthSet.size }
}

async function fetchCreditNotes(): Promise<ApiResponse<ICreditNoteWithSupplier[]>> {
  const { data, error } = await supabase
    .from('credit_notes')
    .select('*, suppliers(name)')
    .is('deleted_at', null)
    .order('period_end', { ascending: false })

  if (error) {
    logger.error('fetchCreditNotes', error)
    return errorResponse(ERROR_MESSAGES.AUDIT_LOAD_FAILED)
  }

  // Guard against Supabase returning numeric columns as strings
  const notes = (data as ICreditNoteWithSupplier[]).map((row) => ({
    ...row,
    expected_amount: Number(row.expected_amount),
    received_amount: Number(row.received_amount),
  }))

  return successResponse(notes)
}

/**
 * Checks if a credit note already exists for the same supplier + rebate type + period.
 * Returns the existing note's id if found, null otherwise.
 */
export async function findDuplicateCreditNote(
  supplierId: string,
  rebateType: string,
  periodStart: string,
  periodEnd: string,
  excludeId?: string,
): Promise<ICreditNoteWithSupplier | null> {
  let query = supabase
    .from('credit_notes')
    .select('*, suppliers(name)')
    .eq('supplier_id', supplierId)
    .eq('rebate_type', rebateType)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .is('deleted_at', null)
    .limit(1)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('findDuplicateCreditNote', error)
    return null
  }

  if (data && data.length > 0) {
    const row = data[0] as ICreditNoteWithSupplier
    return {
      ...row,
      expected_amount: Number(row.expected_amount),
      received_amount: Number(row.received_amount),
    }
  }
  return null
}

async function createCreditNote(
  payload: CreditNoteCreateData,
): Promise<ApiResponse<ICreditNote>> {
  // ── Duplicate guard ──────────────────────────────────
  const existing = await findDuplicateCreditNote(
    payload.supplier_id,
    payload.rebate_type,
    payload.period_start,
    payload.period_end,
  )
  if (existing) {
    return errorResponse(ERROR_MESSAGES.CREDIT_NOTE_DUPLICATE)
  }

  const { data, error } = await supabase
    .from('credit_notes')
    .insert({
      supplier_id: payload.supplier_id,
      rebate_type: payload.rebate_type,
      period_start: payload.period_start,
      period_end: payload.period_end,
      expected_amount: payload.expected_amount,
      received_amount: payload.received_amount,
      status: payload.status,
    })
    .select()
    .single()

  if (error) {
    logger.error('createCreditNote', error)
    return errorResponse(ERROR_MESSAGES.CREDIT_NOTE_CREATE_FAILED)
  }

  return successResponse(data as ICreditNote, HTTP_STATUS.CREATED)
}

async function updateCreditNote(
  id: string,
  data: Partial<CreditNoteCreateData>,
): Promise<ApiResponse<ICreditNote>> {
  const { data: row, error } = await supabase
    .from('credit_notes')
    .update(data)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    logger.error('updateCreditNote', error)
    return errorResponse(ERROR_MESSAGES.CREDIT_NOTE_UPDATE_FAILED)
  }

  return successResponse(row as ICreditNote)
}

async function softDeleteCreditNote(id: string): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('credit_notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) {
    logger.error('softDeleteCreditNote', error)
    return errorResponse(ERROR_MESSAGES.CREDIT_NOTE_DELETE_FAILED)
  }

  return successResponse(null, HTTP_STATUS.NO_CONTENT)
}
