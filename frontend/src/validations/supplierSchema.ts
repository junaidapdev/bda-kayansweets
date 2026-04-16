import { z } from 'zod'
import { RENT_TYPES } from '../constants/bdaRules'

export const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
  target_amount: z
    .number({ invalid_type_error: 'Target must be a number' })
    .positive('Target must be positive')
    .nullable()
    .optional(),
  // Rebate rates (base + milestone model)
  monthly_rate: z.number().min(0).max(100).nullable().optional(),
  quarterly_bonus_rate: z.number().min(0).max(100).nullable().optional(),
  yearly_rate: z.number().min(0).max(100).nullable().optional(),
  // Rent
  rent_type: z.enum(RENT_TYPES).nullable().optional(),
  rent_value: z.number().min(0).nullable().optional(),
  // Targets inside rebate_rules
  monthly_target: z.number().min(0).nullable().optional(),
  quarterly_target: z.number().min(0).nullable().optional(),
  yearly_target: z.number().min(0).nullable().optional(),
})

export type SupplierFormData = z.infer<typeof supplierSchema>
