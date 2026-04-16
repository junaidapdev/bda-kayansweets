import { z } from 'zod'
import { ERROR_MESSAGES } from '../constants/errorMessages'
import { REBATE_LAYERS } from '../constants/bdaRules'

export const creditNoteSchema = z
  .object({
    supplier_id: z.string().uuid(ERROR_MESSAGES.FIELD_REQUIRED),
    rebate_type: z.enum(REBATE_LAYERS, {
      errorMap: () => ({ message: ERROR_MESSAGES.FIELD_REQUIRED }),
    }),
    received_amount: z
      .number({ invalid_type_error: ERROR_MESSAGES.INVALID_AMOUNT })
      .nonnegative(ERROR_MESSAGES.INVALID_AMOUNT),
    status: z.enum(['pending', 'received', 'disputed'] as const, {
      errorMap: () => ({ message: ERROR_MESSAGES.FIELD_REQUIRED }),
    }),
    period_start: z.string().min(1, ERROR_MESSAGES.INVALID_DATE),
    period_end: z.string().min(1, ERROR_MESSAGES.INVALID_DATE),
  })
  .refine(
    (data) => data.period_end > data.period_start,
    {
      message: ERROR_MESSAGES.PERIOD_END_BEFORE_START,
      path: ['period_end'],
    },
  )

export type CreditNoteFormValues = z.infer<typeof creditNoteSchema>
