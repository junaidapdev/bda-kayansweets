import { useCallback, useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { successResponse, errorResponse, type ApiResponse } from '../lib/apiResponse'
import { ERROR_MESSAGES } from '../constants/errorMessages'
import { HTTP_STATUS } from '../constants/httpStatusCodes'
import type { IPurchaseOrder, IPurchaseOrderWithSupplier } from '../interfaces/IPurchaseOrder'
import type { IPurchaseFormData } from '../interfaces/IPurchaseFormData'
import logger from '../lib/logger'

export function usePurchaseOrders() {
  const [orders, setOrders] = useState<IPurchaseOrderWithSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await fetchPurchaseOrders()
    if (result.success && result.data) {
      setOrders(result.data)
      setError(null)
    } else {
      setError(result.error ?? ERROR_MESSAGES.UNKNOWN)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const create = useCallback(async (formData: IPurchaseFormData): Promise<ApiResponse<IPurchaseOrder>> => {
    const result = await createPurchaseOrder(formData)
    if (result.success) await load()
    return result
  }, [load])

  const update = useCallback(async (id: string, formData: IPurchaseFormData): Promise<ApiResponse<IPurchaseOrder>> => {
    const result = await updatePurchaseOrder(id, formData)
    if (result.success) await load()
    return result
  }, [load])

  const remove = useCallback(async (id: string): Promise<ApiResponse<null>> => {
    const result = await deletePurchaseOrder(id)
    if (result.success) await load()
    return result
  }, [load])

  return { orders, loading, error, create, update, remove, reload: load }
}

async function fetchPurchaseOrders(): Promise<ApiResponse<IPurchaseOrderWithSupplier[]>> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(name)')
    .order('order_date', { ascending: false })

  if (error) {
    logger.error('fetchPurchaseOrders', error)
    logger.diagnostic({
      level: 'error',
      event_type: 'purchase_orders.fetch_failed',
      message: 'Failed to fetch purchase orders from Supabase.',
      metadata: { error },
    })
    return errorResponse(ERROR_MESSAGES.PURCHASE_LOAD_FAILED)
  }

  // Guard against Supabase returning numeric columns as strings
  const orders = (data as IPurchaseOrderWithSupplier[]).map((row) => ({
    ...row,
    purchase_amount: Number(row.purchase_amount),
  }))

  return successResponse(orders)
}

async function createPurchaseOrder(formData: IPurchaseFormData): Promise<ApiResponse<IPurchaseOrder>> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .insert({
      supplier_id: formData.supplier_id,
      order_date: formData.order_date,
      purchase_amount: formData.purchase_amount,
      notes: formData.notes || null,
    })
    .select()
    .single()

  if (error) {
    logger.error('createPurchaseOrder', error)
    logger.diagnostic({
      level: 'error',
      event_type: 'purchase_order.create_failed',
      message: 'Failed to create purchase order in Supabase.',
      metadata: {
        error,
        supplier_id: formData.supplier_id,
        order_date: formData.order_date,
        purchase_amount: formData.purchase_amount,
      },
    })
    return errorResponse(ERROR_MESSAGES.PURCHASE_CREATE_FAILED)
  }

  return successResponse(data as IPurchaseOrder, HTTP_STATUS.CREATED)
}

async function updatePurchaseOrder(id: string, formData: IPurchaseFormData): Promise<ApiResponse<IPurchaseOrder>> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .update({
      supplier_id: formData.supplier_id,
      order_date: formData.order_date,
      purchase_amount: formData.purchase_amount,
      notes: formData.notes || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logger.error('updatePurchaseOrder', error)
    logger.diagnostic({
      level: 'error',
      event_type: 'purchase_order.update_failed',
      message: 'Failed to update purchase order in Supabase.',
      metadata: {
        error,
        purchase_order_id: id,
        supplier_id: formData.supplier_id,
        order_date: formData.order_date,
        purchase_amount: formData.purchase_amount,
      },
    })
    return errorResponse(ERROR_MESSAGES.PURCHASE_UPDATE_FAILED)
  }

  return successResponse(data as IPurchaseOrder)
}

async function deletePurchaseOrder(id: string): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('id', id)

  if (error) {
    logger.error('deletePurchaseOrder', error)
    logger.diagnostic({
      level: 'error',
      event_type: 'purchase_order.delete_failed',
      message: 'Failed to delete purchase order in Supabase.',
      metadata: {
        error,
        purchase_order_id: id,
      },
    })
    return errorResponse(ERROR_MESSAGES.PURCHASE_DELETE_FAILED)
  }

  return successResponse(null, HTTP_STATUS.NO_CONTENT)
}
