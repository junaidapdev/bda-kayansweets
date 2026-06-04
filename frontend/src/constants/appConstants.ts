export const APP_NAME = 'KNC Discount'

export const TAB_LABELS = {
  PURCHASES: 'Purchases',
  AUDIT: 'Accounts',
  ANALYTICS: 'Analytics',
  SUPPLIERS: 'Suppliers',
  ACTIVITY: 'Activity',
} as const

export const ROUTES = {
  PURCHASES: '/',
  AUDIT: '/audit',
  ANALYTICS: '/analytics',
  SUPPLIERS: '/suppliers',
  ACTIVITY: '/activity',
} as const

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
} as const

export const DATE_FORMAT = 'dd MMM yyyy' as const

export const CURRENCY = {
  CODE: 'SR',
  LOCALE: 'en-SA',
  SYMBOL: 'SR',
} as const

export const NOTES_MAX_LENGTH = 500 as const

export const REBATE_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const

export const CREDIT_NOTE_STATUS = {
  PENDING: 'pending',
  RECEIVED: 'received',
  DISPUTED: 'disputed',
} as const

export type CreditNoteStatus = (typeof CREDIT_NOTE_STATUS)[keyof typeof CREDIT_NOTE_STATUS]

export const CREDIT_NOTE_STATUS_LABELS: Record<CreditNoteStatus, string> = {
  pending: 'Pending',
  received: 'Received',
  disputed: 'Disputed',
} as const

export const OVERDUE_THRESHOLD_DAYS = 60 as const

export const TARGET_ALERT_THRESHOLD_PERCENT = 75 as const
export const TARGET_NEAR_PERCENT = 95 as const

export const POINTS_DESCRIPTION_MAX_LENGTH = 200 as const
