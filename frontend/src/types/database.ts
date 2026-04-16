import type { IRebateRules } from '../interfaces/IBDARules'

export type Database = {
  public: {
    Tables: {
      suppliers: {
        Row: {
          id: string
          name: string
          rebate_rules: IRebateRules
          target_amount: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          rebate_rules: IRebateRules
          target_amount?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          rebate_rules?: IRebateRules
          target_amount?: number | null
          created_at?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          id: string
          supplier_id: string
          order_date: string
          purchase_amount: number
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          supplier_id: string
          order_date: string
          purchase_amount: number
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string
          order_date?: string
          purchase_amount?: number
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'purchase_orders_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      credit_notes: {
        Row: {
          id: string
          supplier_id: string
          rebate_type: string
          period_start: string
          period_end: string
          expected_amount: number
          received_amount: number
          status: string
          discrepancy_flag: boolean
          verified_by: string | null
          verified_at: string | null
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          supplier_id: string
          rebate_type: string
          period_start: string
          period_end: string
          expected_amount: number
          received_amount?: number
          status?: string
          discrepancy_flag?: boolean
          verified_by?: string | null
          verified_at?: string | null
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          supplier_id?: string
          rebate_type?: string
          period_start?: string
          period_end?: string
          expected_amount?: number
          received_amount?: number
          status?: string
          discrepancy_flag?: boolean
          verified_by?: string | null
          verified_at?: string | null
          created_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'credit_notes_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      rebate_accruals: {
        Row: {
          id: string
          supplier_id: string
          rebate_type: string
          period_start: string
          period_end: string
          total_purchases: number
          rate: number
          expected_amount: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          supplier_id: string
          rebate_type: string
          period_start: string
          period_end: string
          total_purchases?: number
          rate?: number
          expected_amount?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string
          rebate_type?: string
          period_start?: string
          period_end?: string
          total_purchases?: number
          rate?: number
          expected_amount?: number
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rebate_accruals_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      point_ledger: {
        Row: {
          id: string
          supplier_id: string | null
          item_description: string
          points_earned: number
          redeemed: boolean
          redeemed_for: string | null
          created_at: string
        }
        Insert: {
          id?: string
          supplier_id?: string | null
          item_description: string
          points_earned: number
          redeemed?: boolean
          redeemed_for?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string | null
          item_description?: string
          points_earned?: number
          redeemed?: boolean
          redeemed_for?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'point_ledger_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      user_profiles: {
        Row: {
          id: string
          full_name: string
          role: string
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
