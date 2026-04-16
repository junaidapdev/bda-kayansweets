export const ERROR_MESSAGES = {
  // Generic
  UNKNOWN: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',

  // Auth
  ROLE_REQUIRED: 'A valid role is required to access this application.',
  INVALID_ROLE: 'The selected role is not recognised.',

  // Purchases
  PURCHASE_LOAD_FAILED: 'Failed to load purchase orders.',
  PURCHASE_CREATE_FAILED: 'Failed to create purchase order.',
  PURCHASE_UPDATE_FAILED: 'Failed to update purchase order.',
  PURCHASE_DELETE_FAILED: 'Failed to delete purchase order.',
  PURCHASE_NOT_FOUND: 'Purchase order not found.',

  // Audit
  AUDIT_LOAD_FAILED: 'Failed to load audit records.',
  CREDIT_NOTE_CREATE_FAILED: 'Failed to create credit note.',
  CREDIT_NOTE_UPDATE_FAILED: 'Failed to update credit note.',
  CREDIT_NOTE_DELETE_FAILED: 'Failed to delete credit note.',
  REBATE_VERIFY_FAILED: 'Failed to verify rebate.',

  // Analytics
  ANALYTICS_LOAD_FAILED: 'Failed to load analytics data.',
  TARGET_LOAD_FAILED: 'Failed to load target progress data.',
  POINTS_LOAD_FAILED: 'Failed to load points ledger.',
  POINTS_CREATE_FAILED: 'Failed to create points entry.',
  POINTS_UPDATE_FAILED: 'Failed to update points ledger.',
  POINTS_DELETE_FAILED: 'Failed to delete points entry.',

  // Suppliers
  SUPPLIER_LOAD_FAILED: 'Failed to load suppliers.',
  SUPPLIER_CREATE_FAILED: 'Failed to create supplier.',
  SUPPLIER_UPDATE_FAILED: 'Failed to update supplier.',
  SUPPLIER_DELETE_FAILED: 'Failed to delete supplier.',

  // Credit Note validation
  CREDIT_NOTE_DUPLICATE: 'A credit note already exists for this supplier, rebate type, and period.',
  PERIOD_END_BEFORE_START: 'Period end date must be after start date.',

  // Validation
  FIELD_REQUIRED: 'This field is required.',
  INVALID_DATE: 'Please enter a valid date.',
  INVALID_AMOUNT: 'Please enter a valid positive amount.',
  INVALID_PERCENTAGE: 'Percentage must be between 0 and 100.',
} as const
