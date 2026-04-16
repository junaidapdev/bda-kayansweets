/**
 * All rebate layers per supplier.
 * Base + Milestone model: monthly, quarterly_bonus, yearly, rent.
 */
export const REBATE_LAYERS = [
  'monthly',
  'quarterly_bonus',
  'yearly',
  'rent',
] as const

export type RebateLayer = (typeof REBATE_LAYERS)[number]

export const REBATE_LAYER_LABELS: Record<RebateLayer, string> = {
  monthly: 'Monthly',
  quarterly_bonus: 'Quarterly Bonus',
  yearly: 'Yearly',
  rent: 'Rent',
}

/**
 * Maps each layer to the key in supplier.rebate_rules that holds its rate.
 */
export const REBATE_LAYER_RATE_KEY: Record<RebateLayer, string> = {
  monthly: 'monthly_rate',
  quarterly_bonus: 'quarterly_bonus_rate',
  yearly: 'yearly_rate',
  rent: 'rent_value',
}

export const RENT_TYPES = ['percentage', 'fixed'] as const
export type RentType = (typeof RENT_TYPES)[number]

export const RENT_TYPE_LABELS: Record<RentType, string> = {
  percentage: 'Percentage (%)',
  fixed: 'Fixed Amount (SR)',
}
