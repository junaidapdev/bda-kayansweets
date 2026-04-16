export interface IPurchaseOrder {
  id: string
  supplier_id: string
  order_date: string
  purchase_amount: number
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface IPurchaseOrderWithSupplier extends IPurchaseOrder {
  suppliers: {
    name: string
  }
}
