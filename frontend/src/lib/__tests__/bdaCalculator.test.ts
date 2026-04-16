import { describe, it, expect } from 'vitest'
import {
  applyRate,
  computeLayerAmount,
  computeStackedBDA,
  getQuarter,
  getQuarterForDate,
  isQuarterComplete,
  isYearComplete,
  type PeriodPurchases,
} from '../bdaCalculator'
import type { IRebateRules } from '../../interfaces/IBDARules'

// -----------------------------------------------------------
// applyRate
// -----------------------------------------------------------
describe('applyRate', () => {
  it('calculates correctly for normal inputs', () => {
    expect(applyRate(100_000, 3)).toBe(3000)
  })

  it('returns 0 when purchases is 0', () => {
    expect(applyRate(0, 5)).toBe(0)
  })

  it('returns 0 when rate is 0', () => {
    expect(applyRate(50_000, 0)).toBe(0)
  })

  it('returns 0 for negative purchases', () => {
    expect(applyRate(-1000, 3)).toBe(0)
  })

  it('handles small fractional amounts with rounding', () => {
    expect(applyRate(333, 1)).toBe(3.33)
  })
})

// -----------------------------------------------------------
// getQuarter / getQuarterForDate
// -----------------------------------------------------------
describe('getQuarter', () => {
  it('Jan=Q1', () => expect(getQuarter(0)).toBe(1))
  it('Mar=Q1', () => expect(getQuarter(2)).toBe(1))
  it('Apr=Q2', () => expect(getQuarter(3)).toBe(2))
  it('Jun=Q2', () => expect(getQuarter(5)).toBe(2))
  it('Jul=Q3', () => expect(getQuarter(6)).toBe(3))
  it('Sep=Q3', () => expect(getQuarter(8)).toBe(3))
  it('Oct=Q4', () => expect(getQuarter(9)).toBe(4))
  it('Dec=Q4', () => expect(getQuarter(11)).toBe(4))
})

describe('getQuarterForDate', () => {
  it('Jan 15 → Q1', () => expect(getQuarterForDate(new Date(2026, 0, 15))).toBe(1))
  it('Apr 1 → Q2', () => expect(getQuarterForDate(new Date(2026, 3, 1))).toBe(2))
  it('Dec 31 → Q4', () => expect(getQuarterForDate(new Date(2026, 11, 31))).toBe(4))
})

// -----------------------------------------------------------
// isQuarterComplete
// -----------------------------------------------------------
describe('isQuarterComplete', () => {
  const base: PeriodPurchases = { monthly: 0, quarterly: 0, yearly: 0, quarterlyBreakdown: [0, 0, 0, 0] }

  it('Q1 is NOT complete if only Jan is present', () => {
    const p = { ...base, monthlyBreakdown: [1000, 0, 0, ...Array(9).fill(0)] }
    expect(isQuarterComplete(1, p)).toBe(false)
  })

  it('Q1 IS complete if Jan, Feb, Mar are present', () => {
    const p = { ...base, monthlyBreakdown: [1000, 1000, 1000, ...Array(9).fill(0)] }
    expect(isQuarterComplete(1, p)).toBe(true)
  })

  it('Q2 is NOT complete if May is missing', () => {
    const p = { ...base, monthlyBreakdown: [...Array(3).fill(0), 1000, 0, 1000, ...Array(6).fill(0)] }
    expect(isQuarterComplete(2, p)).toBe(false)
  })
})

// -----------------------------------------------------------
// isYearComplete
// -----------------------------------------------------------
describe('isYearComplete', () => {
  const base: PeriodPurchases = { monthly: 0, quarterly: 0, yearly: 0, quarterlyBreakdown: [0, 0, 0, 0] }

  it('Year is NOT complete if 11 months are present', () => {
    const p = { ...base, monthlyBreakdown: [...Array(11).fill(1000), 0] }
    expect(isYearComplete(p)).toBe(false)
  })

  it('Year IS complete if all 12 months present', () => {
    const p = { ...base, monthlyBreakdown: Array(12).fill(1000) }
    expect(isYearComplete(p)).toBe(true)
  })
})

// -----------------------------------------------------------
// computeLayerAmount
// -----------------------------------------------------------
describe('computeLayerAmount', () => {
  const rules: IRebateRules = {
    monthly_rate: 2,
    quarterly_bonus_rate: 2.5,
    yearly_rate: 6,
    rent_type: 'percentage',
    rent_value: 1,
  }

  it('computes monthly layer', () => {
    expect(computeLayerAmount(10_000, 'monthly', rules)).toBe(200)
  })

  it('computes quarterly_bonus layer', () => {
    expect(computeLayerAmount(30_000, 'quarterly_bonus', rules)).toBe(750)
  })

  it('computes yearly layer', () => {
    expect(computeLayerAmount(30_000, 'yearly', rules)).toBe(1800)
  })

  it('computes rent as percentage', () => {
    expect(computeLayerAmount(30_000, 'rent', rules)).toBe(300)
  })

  it('computes rent as fixed amount ignoring purchases', () => {
    const fixedRules: IRebateRules = { rent_type: 'fixed', rent_value: 500 }
    expect(computeLayerAmount(999_999, 'rent', fixedRules)).toBe(500)
  })

  it('returns 0 for missing rate', () => {
    const emptyRules: IRebateRules = {}
    expect(computeLayerAmount(10_000, 'monthly', emptyRules)).toBe(0)
  })
})

// -----------------------------------------------------------
// SPEC TEST CASES
// -----------------------------------------------------------
const SPEC_RULES: IRebateRules = {
  monthly_rate: 2,
  quarterly_bonus_rate: 2.5,
  yearly_rate: 6,
  rent_type: 'percentage',
  rent_value: 1,
}

describe('SPEC Case 1 — JAN ONLY (10,000)', () => {
  const purchases: PeriodPurchases = {
    monthly: 10_000,
    quarterly: 10_000,
    yearly: 10_000,
    quarterlyBreakdown: [10_000, 0, 0, 0],
    monthlyBreakdown: [10_000, 0, 0, ...Array(9).fill(0)],
  }

  it('Calculates Q1 correctly (In Progress)', () => {
    const result = computeStackedBDA(purchases, SPEC_RULES)
    const q1 = result.quarters[0]
    expect(q1.status).toBe('in_progress')
    expect(q1.rebates.monthly.amount).toBe(200)
    expect(q1.rebates.rent.amount).toBe(100)
    expect(q1.rebates.bonus.amount).toBe(250) // Potential
    expect(q1.rebates.subtotal).toBe(300) // (200 + 100)
  })

  it('Calculates Yearly correctly (In Progress)', () => {
    const result = computeStackedBDA(purchases, SPEC_RULES)
    expect(result.yearProgress.status).toBe('in_progress')
    expect(result.yearProgress.bonus.amount).toBe(600) // Potential
  })

  it('Calculates Total Expected correctly', () => {
    const result = computeStackedBDA(purchases, SPEC_RULES)
    expect(result.totalExpectedRebate).toBe(300)
  })
})

describe('SPEC Case 2 — JAN–MAR (30,000, Q1 complete)', () => {
  const purchases: PeriodPurchases = {
    monthly: 10_000,
    quarterly: 0,
    yearly: 30_000,
    quarterlyBreakdown: [30_000, 0, 0, 0],
    monthlyBreakdown: [10_000, 10_000, 10_000, ...Array(9).fill(0)],
  }

  it('Calculates Q1 correctly (Completed)', () => {
    const result = computeStackedBDA(purchases, SPEC_RULES)
    const q1 = result.quarters[0]
    expect(q1.status).toBe('completed')
    expect(q1.rebates.monthly.amount).toBe(600)
    expect(q1.rebates.rent.amount).toBe(300)
    expect(q1.rebates.bonus.amount).toBe(750) 
    expect(q1.rebates.subtotal).toBe(1650) // (600 + 300 + 750)
  })

  it('Calculates Yearly correctly (In Progress)', () => {
    const result = computeStackedBDA(purchases, SPEC_RULES)
    expect(result.yearProgress.status).toBe('in_progress')
    expect(result.yearProgress.bonus.amount).toBe(1800)
  })

  it('Calculates Total Expected correctly', () => {
    const result = computeStackedBDA(purchases, SPEC_RULES)
    expect(result.totalExpectedRebate).toBe(1650)
  })
})

describe('SPEC Case 3 — FULL YEAR (120,000)', () => {
  const purchases: PeriodPurchases = {
    monthly: 10_000,
    quarterly: 0,
    yearly: 120_000,
    quarterlyBreakdown: [30_000, 30_000, 30_000, 30_000],
    monthlyBreakdown: Array(12).fill(10_000),
  }

  it('All quarters completed', () => {
    const result = computeStackedBDA(purchases, SPEC_RULES)
    result.quarters.forEach(q => {
      expect(q.status).toBe('completed')
      expect(q.rebates.bonus.amount).toBe(750)
      expect(q.rebates.subtotal).toBe(1650)
    })
  })

  it('Yearly bonus earned', () => {
    const result = computeStackedBDA(purchases, SPEC_RULES)
    expect(result.yearProgress.status).toBe('completed')
    expect(result.yearProgress.bonus.amount).toBe(7200)
  })

  it('Calculates Total Expected correctly', () => {
    const result = computeStackedBDA(purchases, SPEC_RULES)
    // 4 quarters * 1650 = 6600. Plus 7200 = 13800
    expect(result.totalExpectedRebate).toBe(13800)
  })
})

// -----------------------------------------------------------
// Edge cases
// -----------------------------------------------------------
describe('Edge cases', () => {
  it('no purchases → all zeros', () => {
    const zero: PeriodPurchases = { monthly: 0, quarterly: 0, yearly: 0, quarterlyBreakdown: [0, 0, 0, 0], monthlyBreakdown: Array(12).fill(0) }
    const result = computeStackedBDA(zero, SPEC_RULES)
    expect(result.totalExpectedRebate).toBe(0)
  })

  it('empty rules → all zeros', () => {
    const purchases: PeriodPurchases = { monthly: 10_000, quarterly: 10_000, yearly: 10_000, quarterlyBreakdown: [10_000, 0, 0, 0], monthlyBreakdown: [10_000, ...Array(11).fill(0)] }
    const result = computeStackedBDA(purchases, {})
    expect(result.totalExpectedRebate).toBe(0)
  })

  it('multiple completed quarters sum correctly', () => {
    const purchases: PeriodPurchases = {
      monthly: 10_000,
      quarterly: 10_000,
      yearly: 60_000,
      quarterlyBreakdown: [20_000, 30_000, 10_000, 0],
      monthlyBreakdown: [10_000, 10_000, 10_000, 10_000, 10_000, 10_000, 10_000, ...Array(5).fill(0)],
    }
    const result = computeStackedBDA(purchases, SPEC_RULES)
    expect(result.quarters[0].rebates.bonus.amount).toBe(500)
    expect(result.quarters[1].rebates.bonus.amount).toBe(750)
  })

  it('fixed rent correctly distributed', () => {
    const fixedRules: IRebateRules = {
      monthly_rate: 2,
      rent_type: 'fixed',
      rent_value: 500,
    }
    const purchases: PeriodPurchases = {
      monthly: 10_000,
      quarterly: 10_000,
      yearly: 10_000,
      quarterlyBreakdown: [10_000, 0, 0, 0],
      monthlyBreakdown: [10_000, ...Array(11).fill(0)],
    }
    const result = computeStackedBDA(purchases, fixedRules)
    // 500 / 4 = 125 per quarter
    expect(result.quarters[0].rebates.rent.amount).toBe(125)
  })
})
