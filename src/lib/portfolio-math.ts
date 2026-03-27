import type { ResearchedHolding, AllocationBreakdown, IncomeBreakdown } from '@/lib/types'

/**
 * Converts each holding's marketValue to CAD, then sets `weight` (% of total
 * portfolio value) on every holding.  Returns a new array — does not mutate.
 */
export function calculatePortfolioWeights(
  holdings: ResearchedHolding[],
  usdToCad = 1.36,
): ResearchedHolding[] {
  const totalCad = holdings.reduce((sum, h) => {
    const valueCad = h.currency === 'USD' ? h.marketValue * usdToCad : h.marketValue
    return sum + valueCad
  }, 0)

  if (totalCad === 0) {
    return holdings.map((h) => ({ ...h, weight: 0 }))
  }

  return holdings.map((h) => {
    const valueCad = h.currency === 'USD' ? h.marketValue * usdToCad : h.marketValue
    return { ...h, weight: (valueCad / totalCad) * 100 }
  })
}

/**
 * Calculates the total portfolio value in CAD.
 */
export function totalPortfolioValue(holdings: ResearchedHolding[], usdToCad = 1.36): number {
  return holdings.reduce((sum, h) => {
    const valueCad = h.currency === 'USD' ? h.marketValue * usdToCad : h.marketValue
    return sum + valueCad
  }, 0)
}

/**
 * Produces a weighted-average AllocationBreakdown across all holdings.
 * Holdings must already have `weight` populated (run calculatePortfolioWeights first).
 */
export function aggregateAllocation(holdings: ResearchedHolding[]): AllocationBreakdown {
  const result: AllocationBreakdown = {
    equity: 0,
    fixedIncome: 0,
    cash: 0,
    alternatives: 0,
    canadaEquity: 0,
    usEquity: 0,
    internationalEquity: 0,
  }

  for (const h of holdings) {
    const w = h.weight / 100 // convert percentage weight to decimal
    result.equity += (h.allocation.equity ?? 0) * w
    result.fixedIncome += (h.allocation.fixedIncome ?? 0) * w
    result.cash += (h.allocation.cash ?? 0) * w
    result.alternatives += (h.allocation.alternatives ?? 0) * w
    result.canadaEquity += (h.allocation.canadaEquity ?? 0) * w
    result.usEquity += (h.allocation.usEquity ?? 0) * w
    result.internationalEquity += (h.allocation.internationalEquity ?? 0) * w
  }

  // Round to 2 decimal places for cleanliness
  for (const key of Object.keys(result) as (keyof AllocationBreakdown)[]) {
    result[key] = Math.round(result[key] * 100) / 100
  }

  return result
}

/**
 * Aggregates income across all holdings for the given year.
 * Income values on ResearchedHolding are per-unit distributions in CAD.
 * We multiply by units to get total income per holding.
 * Holdings with no units fall back to 0 contribution.
 */
export function aggregateIncome(holdings: ResearchedHolding[], year: number): IncomeBreakdown {
  const result: IncomeBreakdown = {
    year,
    eligibleDividends: 0,
    interest: 0,
    capitalGains: 0,
    returnOfCapital: 0,
    foreignIncome: 0,
    total: 0,
  }

  for (const h of holdings) {
    if (h.income.year !== year) continue
    const units = h.units ?? 0
    result.eligibleDividends += (h.income.eligibleDividends ?? 0) * units
    result.interest += (h.income.interest ?? 0) * units
    result.capitalGains += (h.income.capitalGains ?? 0) * units
    result.returnOfCapital += (h.income.returnOfCapital ?? 0) * units
    result.foreignIncome += (h.income.foreignIncome ?? 0) * units
    result.total += (h.income.total ?? 0) * units
  }

  // Round all numeric values to 2 decimal places
  const numericKeys = [
    'eligibleDividends',
    'interest',
    'capitalGains',
    'returnOfCapital',
    'foreignIncome',
    'total',
  ] as const
  for (const key of numericKeys) {
    result[key] = Math.round(result[key] * 100) / 100
  }

  return result
}

/**
 * Calculates a weighted-average MER across holdings that have a MER value.
 * Holdings without a MER are excluded from the average.
 * Holdings must already have `weight` populated.
 */
export function weightedMER(holdings: ResearchedHolding[]): number {
  let weightSum = 0
  let merSum = 0

  for (const h of holdings) {
    if (h.mer != null) {
      merSum += h.mer * h.weight
      weightSum += h.weight
    }
  }

  if (weightSum === 0) return 0
  return Math.round((merSum / weightSum) * 10000) / 10000 // 4 decimal places
}
