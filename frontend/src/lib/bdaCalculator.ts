import type { IRebateRules } from '../interfaces/IBDARules'
import { type RebateLayer } from '../constants/bdaRules'

// ── Types ────────────────────────────────────────────────

/**
 * Purchase totals grouped by period.
 * Used for both display and calculation.
 */
export interface PeriodPurchases {
  monthly: number    // current month purchases (display)
  quarterly: number  // current quarter purchases (display)
  yearly: number     // current year total (display + calculation)
  /** Per-quarter breakdown: [Q1, Q2, Q3, Q4] totals for the year */
  quarterlyBreakdown: [number, number, number, number]
  /** Per-month breakdown: 12 elements (0-11) totals for the year */
  monthlyBreakdown?: number[]
}

/** Result for one rebate component. */
export interface RebateItem {
  label: string
  rate: number
  purchases: number
  amount: number
}

export type PeriodStatus = 'completed' | 'in_progress' | 'future'

export interface PeriodRebate {
  purchases: number
  monthly: RebateItem
  rent: RebateItem
  bonus: RebateItem // quarterlyBonus or yearlyBonus
  subtotal: number
}

export interface QuarterBreakdown {
  quarterId: number // 1, 2, 3, 4
  status: PeriodStatus
  rebates: PeriodRebate
}

export interface YearBreakdown {
  status: PeriodStatus
  purchases: number
  bonus: RebateItem
}

/** For backwards compat with credit notes — single layer result. */
export interface LayerResult {
  layer: RebateLayer
  rate: number
  totalPurchases: number
  amount: number
}

/** Full rebate result for a supplier. */
export interface StackedBDAResult {
  layers: LayerResult[]
  totalExpectedRebate: number
  monthlyTargetMet: boolean
  quarterlyTargetMet: boolean
  yearlyTargetMet: boolean
  quarters: QuarterBreakdown[]
  yearProgress: YearBreakdown
}

// ── Quarter / Year helpers ───────────────────────────────

/**
 * Returns which quarter (1–4) a month falls in. Month is 0-indexed.
 */
export function getQuarter(month: number): number {
  return Math.floor(month / 3) + 1
}

/**
 * Returns which quarter (1–4) a Date falls in.
 */
export function getQuarterForDate(date: Date): number {
  return getQuarter(date.getMonth())
}

/**
 * Checks if a given quarter is complete based on data.
 * A quarter is complete ONLY if there are purchases in all 3 months of that quarter (3 months present).
 */
export function isQuarterComplete(quarter: number, purchases: PeriodPurchases): boolean {
  const startMonth = (quarter - 1) * 3
  for (let i = 0; i < 3; i++) {
    if ((purchases.monthlyBreakdown?.[startMonth + i] ?? 0) <= 0) {
      return false
    }
  }
  return true
}

/**
 * Checks if a given year is fully complete based on data.
 * A year is complete ONLY if there are purchases in all 12 months (12 months present).
 */
export function isYearComplete(purchases: PeriodPurchases): boolean {
  for (let i = 0; i < 12; i++) {
    if ((purchases.monthlyBreakdown?.[i] ?? 0) <= 0) {
      return false
    }
  }
  return true
}

// ── Pure helpers ─────────────────────────────────────────

/** Applies a percentage rate to a purchase total. */
export function applyRate(purchases: number, ratePercent: number): number {
  if (purchases <= 0 || ratePercent <= 0) return 0
  return Math.round(purchases * ratePercent * 100) / 10000
}

// ── Single-layer calculation (for credit notes) ──────────

/**
 * Computes the expected amount for ONE rebate layer.
 * Used by the credit-note modal to populate the expected field.
 */
export function computeLayerAmount(
  totalPurchases: number,
  layer: RebateLayer,
  rules: IRebateRules,
): number {
  switch (layer) {
    case 'monthly':
      return applyRate(totalPurchases, rules.monthly_rate ?? 0)
    case 'quarterly_bonus':
      return applyRate(totalPurchases, rules.quarterly_bonus_rate ?? 0)
    case 'yearly':
      return applyRate(totalPurchases, rules.yearly_rate ?? 0)
    case 'rent': {
      if (rules.rent_type === 'fixed') return rules.rent_value ?? 0
      return applyRate(totalPurchases, rules.rent_value ?? 0)
    }
    default:
      return 0
  }
}

// ── Main calculation function ────────────────────────────

/**
 * Calculates all rebates for a supplier using the base + milestone model.
 *
 * Business rules:
 *   - Monthly: applies to total purchases → always earned
 *   - Rent: applies to total purchases → always earned
 *   - Quarterly Bonus: for each complete quarter, quarterTotal × rate → earned
 *                      for the current incomplete quarter → inProgress
 *   - Yearly Bonus: totalYear × rate → earned only if year complete,
 *                   otherwise → inProgress
 *
 * @param purchases - Period purchase totals including per-quarter breakdown
 * @param rules - Supplier rebate rules
 * @param referenceYear - Optional year these purchases belong to.
 *        When set to a past year, all 4 quarters are treated as past
 *        so nothing shows as "future".
 */
export function computeStackedBDA(
  purchases: PeriodPurchases,
  rules: IRebateRules,
  referenceYear?: number,
): StackedBDAResult {
  const totalPurchases = purchases.yearly

  const monthlyRate = rules.monthly_rate ?? 0
  const rentRate = rules.rent_value ?? 0
  const isFixedRent = rules.rent_type === 'fixed'
  const quarterlyBonusRate = rules.quarterly_bonus_rate ?? 0
  const yearlyRate = rules.yearly_rate ?? 0

  const quarters: QuarterBreakdown[] = []
  let totalExpectedRebate = 0

  const now = new Date()
  const currentYear = now.getFullYear()
  const isPastYear = referenceYear !== undefined && referenceYear < currentYear
  const currentQuarter = isPastYear ? 4 : getQuarterForDate(now)

  const fixedRentPerQuarter = isFixedRent ? (rentRate / 4) : 0

  for (let q = 1; q <= 4; q++) {
    const qPurchases = purchases.quarterlyBreakdown[q - 1]
    const monthlyAmount = applyRate(qPurchases, monthlyRate)
    const rentAmount = isFixedRent ? fixedRentPerQuarter : applyRate(qPurchases, rentRate)
    const qbPotential = applyRate(qPurchases, quarterlyBonusRate)

    let status: PeriodStatus = 'future'
    if (isQuarterComplete(q, purchases)) {
      status = 'completed'
    } else if (qPurchases > 0) {
      // Quarter has some data but isn't complete
      status = 'in_progress'
    } else if (!isPastYear && q <= currentQuarter) {
      // Current year: quarter hasn't arrived or just started with no data yet
      status = 'in_progress'
    }
    // else: future (no data and either past year or quarter hasn't arrived)

    let subtotal = monthlyAmount + rentAmount
    if (status === 'completed') {
      subtotal += qbPotential
    }

    // Don't accrue anything for future/empty quarters
    if (status === 'future' && qPurchases === 0) {
      subtotal = 0
    }

    quarters.push({
      quarterId: q,
      status,
      rebates: {
        purchases: qPurchases,
        monthly: { label: 'Monthly', rate: monthlyRate, purchases: qPurchases, amount: monthlyAmount },
        rent: { label: 'Rent', rate: rentRate, purchases: isFixedRent ? 0 : qPurchases, amount: rentAmount },
        bonus: { label: 'Quarterly Bonus', rate: quarterlyBonusRate, purchases: qPurchases, amount: qbPotential },
        subtotal
      }
    })

    totalExpectedRebate += subtotal
  }

  const isYearC = isYearComplete(purchases)
  const yearlyBonusPotential = applyRate(totalPurchases, yearlyRate)
  const yearlySubtotal = isYearC ? yearlyBonusPotential : 0

  const yearProgress: YearBreakdown = {
    status: isYearC ? 'completed' : 'in_progress',
    purchases: totalPurchases,
    bonus: { label: 'Yearly Bonus', rate: yearlyRate, purchases: totalPurchases, amount: yearlyBonusPotential }
  }

  totalExpectedRebate += yearlySubtotal

  // Legacy layers array (for credit notes compat)
  // We sum things up for the macro level
  const MonthlyMacroTotal = applyRate(totalPurchases, monthlyRate)
  const RentMacroTotal = isFixedRent ? rentRate : applyRate(totalPurchases, rentRate)
  const QBMacroTotal = quarters.reduce((sum, q) => sum + q.rebates.bonus.amount, 0)
  
  const layers: LayerResult[] = [
    { layer: 'monthly', rate: monthlyRate, totalPurchases, amount: MonthlyMacroTotal },
    { layer: 'quarterly_bonus', rate: quarterlyBonusRate, totalPurchases, amount: QBMacroTotal },
    { layer: 'yearly', rate: yearlyRate, totalPurchases, amount: yearlyBonusPotential },
    { layer: 'rent', rate: rentRate, totalPurchases: isFixedRent ? 0 : totalPurchases, amount: RentMacroTotal },
  ]

  return {
    layers,
    totalExpectedRebate,
    monthlyTargetMet: (rules.monthly_target ?? 0) > 0 && purchases.monthly >= (rules.monthly_target ?? 0),
    quarterlyTargetMet: (rules.quarterly_target ?? 0) > 0 && purchases.quarterly >= (rules.quarterly_target ?? 0),
    yearlyTargetMet: (rules.yearly_target ?? 0) > 0 && purchases.yearly >= (rules.yearly_target ?? 0),
    quarters,
    yearProgress,
  }
}
