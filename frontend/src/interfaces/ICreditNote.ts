import type { RebateLayer } from '../constants/bdaRules'

export interface ICreditNote {
  id: string
  supplier_id: string
  rebate_type: RebateLayer
  period_start: string
  period_end: string
  expected_amount: number
  received_amount: number
  status: 'pending' | 'received' | 'disputed'
  discrepancy_flag: boolean
  verified_by: string | null
  verified_at: string | null
  created_at: string
  deleted_at: string | null
}

export interface ICreditNoteWithSupplier extends ICreditNote {
  suppliers: {
    name: string
  }
}
