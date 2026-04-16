import { useEffect, useState, useCallback } from 'react'
import supabase from '../lib/supabaseClient'
import { successResponse, errorResponse, type ApiResponse } from '../lib/apiResponse'
import { ERROR_MESSAGES } from '../constants/errorMessages'
import { HTTP_STATUS } from '../constants/httpStatusCodes'
import type { ISupplier } from '../interfaces/ISupplier'
import type { SupplierFormData } from '../validations/supplierSchema'
import type { IRebateRules, RentType } from '../interfaces/IBDARules'
import logger from '../lib/logger'

function formDataToSupplier(data: SupplierFormData): { name: string; target_amount: number | null; rebate_rules: IRebateRules } {
  const rebate_rules: IRebateRules = {}
  if (data.monthly_rate != null) rebate_rules.monthly_rate = data.monthly_rate
  if (data.quarterly_bonus_rate != null) rebate_rules.quarterly_bonus_rate = data.quarterly_bonus_rate
  if (data.yearly_rate != null) rebate_rules.yearly_rate = data.yearly_rate
  if (data.rent_type != null) rebate_rules.rent_type = data.rent_type as RentType
  if (data.rent_value != null) rebate_rules.rent_value = data.rent_value
  if (data.monthly_target != null) rebate_rules.monthly_target = data.monthly_target
  if (data.quarterly_target != null) rebate_rules.quarterly_target = data.quarterly_target
  if (data.yearly_target != null) rebate_rules.yearly_target = data.yearly_target

  return {
    name: data.name,
    target_amount: data.target_amount ?? null,
    rebate_rules,
  }
}

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<ISupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await fetchSuppliers()
    if (result.success && result.data) {
      setSuppliers(result.data)
      setError(null)
    } else {
      setError(result.error ?? ERROR_MESSAGES.UNKNOWN)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchSuppliers().then((result) => {
      if (cancelled) return
      if (result.success && result.data) {
        setSuppliers(result.data)
        setError(null)
      } else {
        setError(result.error ?? ERROR_MESSAGES.UNKNOWN)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const create = useCallback(async (data: SupplierFormData): Promise<ApiResponse<ISupplier>> => {
    const payload = formDataToSupplier(data)
    const { data: row, error: err } = await supabase
      .from('suppliers')
      .insert(payload)
      .select()
      .single()

    if (err) {
      logger.error('createSupplier', err)
      return errorResponse(ERROR_MESSAGES.SUPPLIER_CREATE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    const supplier = row as ISupplier
    setSuppliers((prev) => [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name)))
    return successResponse(supplier, HTTP_STATUS.CREATED)
  }, [])

  const update = useCallback(async (id: string, data: SupplierFormData): Promise<ApiResponse<ISupplier>> => {
    const payload = formDataToSupplier(data)
    const { data: row, error: err } = await supabase
      .from('suppliers')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (err) {
      logger.error('updateSupplier', err)
      return errorResponse(ERROR_MESSAGES.SUPPLIER_UPDATE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    const supplier = row as ISupplier
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? supplier : s)).sort((a, b) => a.name.localeCompare(b.name))
    )
    return successResponse(supplier)
  }, [])

  const remove = useCallback(async (id: string): Promise<ApiResponse<null>> => {
    // Delete related records first to avoid foreign key violations
    const { error: poErr } = await supabase.from('purchase_orders').delete().eq('supplier_id', id)
    if (poErr) {
      logger.error('deleteSupplier: purchase_orders cleanup', poErr)
      return errorResponse(ERROR_MESSAGES.SUPPLIER_DELETE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    const { error: cnErr } = await supabase.from('credit_notes').delete().eq('supplier_id', id)
    if (cnErr) {
      logger.error('deleteSupplier: credit_notes cleanup', cnErr)
      return errorResponse(ERROR_MESSAGES.SUPPLIER_DELETE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    const { error: raErr } = await supabase.from('rebate_accruals').delete().eq('supplier_id', id)
    if (raErr) {
      logger.error('deleteSupplier: rebate_accruals cleanup', raErr)
      return errorResponse(ERROR_MESSAGES.SUPPLIER_DELETE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    const { error: plErr } = await supabase.from('point_ledger').delete().eq('supplier_id', id)
    if (plErr) {
      logger.error('deleteSupplier: point_ledger cleanup', plErr)
      return errorResponse(ERROR_MESSAGES.SUPPLIER_DELETE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    const { error: err } = await supabase.from('suppliers').delete().eq('id', id)
    if (err) {
      logger.error('deleteSupplier', err)
      return errorResponse(ERROR_MESSAGES.SUPPLIER_DELETE_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    setSuppliers((prev) => prev.filter((s) => s.id !== id))
    return successResponse(null)
  }, [])

  return { suppliers, loading, error, load, create, update, remove }
}

async function fetchSuppliers(): Promise<ApiResponse<ISupplier[]>> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name')

  if (error) {
    logger.error('fetchSuppliers', error)
    return errorResponse(ERROR_MESSAGES.SUPPLIER_LOAD_FAILED)
  }

  return successResponse(data as ISupplier[])
}
