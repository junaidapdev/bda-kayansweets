export type RentType = 'percentage' | 'fixed'

/**
 * Stacked rebate rules — ALL layers apply simultaneously to every supplier.
 * Rates are percentages (e.g. 2.5 means 2.5%).
 * rent_value is either a percentage or a fixed SR amount depending on rent_type.
 */
export interface IRebateRules {
  monthly_rate?: number
  quarterly_bonus_rate?: number
  yearly_rate?: number
  rent_type?: RentType
  rent_value?: number
  monthly_target?: number
  quarterly_target?: number
  yearly_target?: number
}
