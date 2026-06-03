import type { Coin } from './coins'

export interface ForecastInputs {
  coin: Coin
  holdingsUnits: number
  unitsPerMonth: number
  /** Per-ounce spot price for each of the next N months. */
  monthlySpotPerOz: number[]
  /** Dollars per oz the dealer pays above spot when you sell. */
  dealerPremiumPerOz: number
}

export interface MonthRow {
  monthIndex: number  // 0-based; month 0 = "now / next sale"
  spotPerOz: number
  pricePerCoin: number   // (spot + premium) × troyOz
  unitsSold: number
  inventoryAfter: number
  proceedsThisMonth: number
  cumulativeProceeds: number
}

export interface ForecastResult {
  rows: MonthRow[]
  totalProceeds: number
  totalUnitsSold: number
  monthsToLiquidate: number  // 0 if there are no units to sell
  averagePricePerCoin: number
  finalLiquidationDate: Date | null
}

/**
 * Simulate the sale month-by-month. Stops when inventory hits zero.
 * The forecast array can be longer than needed — extra months are ignored.
 * If the forecast runs out before inventory does, the last known spot price
 * is held flat for the remaining months (with a warning surfaced upstream).
 */
export function simulate(inputs: ForecastInputs): ForecastResult {
  const { coin, holdingsUnits, unitsPerMonth, monthlySpotPerOz, dealerPremiumPerOz } = inputs
  const rows: MonthRow[] = []
  let inventory = Math.max(0, Math.floor(holdingsUnits))
  let cumulative = 0
  const rate = Math.max(0, Math.floor(unitsPerMonth))

  // Hard cap so a rate of 0 doesn't loop forever — 480 months = 40 years
  const MAX_MONTHS = 480

  let i = 0
  while (inventory > 0 && i < MAX_MONTHS && rate > 0) {
    const spot = monthlySpotPerOz[i] ?? monthlySpotPerOz[monthlySpotPerOz.length - 1] ?? 0
    const pricePerCoin = (spot + dealerPremiumPerOz) * coin.troyOz
    const unitsSold = Math.min(rate, inventory)
    const proceeds = unitsSold * pricePerCoin
    cumulative += proceeds
    inventory -= unitsSold
    rows.push({
      monthIndex: i,
      spotPerOz: spot,
      pricePerCoin,
      unitsSold,
      inventoryAfter: inventory,
      proceedsThisMonth: proceeds,
      cumulativeProceeds: cumulative,
    })
    i += 1
  }

  const totalUnitsSold = rows.reduce((s, r) => s + r.unitsSold, 0)
  const averagePricePerCoin = totalUnitsSold > 0 ? cumulative / totalUnitsSold : 0
  const finalLiquidationDate =
    rows.length > 0 ? addMonths(new Date(), rows.length) : null

  return {
    rows,
    totalProceeds: cumulative,
    totalUnitsSold,
    monthsToLiquidate: rows.length,
    averagePricePerCoin,
    finalLiquidationDate,
  }
}

/**
 * Build a default forecast array: today's spot price grown by a steady
 * annual % rate. `months` controls the array length (long enough that
 * even slow sell rates have a price for every month).
 */
export function buildLinearForecast(
  todaysSpot: number,
  annualGrowthPct: number,
  months: number,
): number[] {
  const monthlyRate = Math.pow(1 + annualGrowthPct / 100, 1 / 12)
  const out: number[] = []
  let p = todaysSpot
  for (let i = 0; i < months; i++) {
    out.push(p)
    p = p * monthlyRate
  }
  return out
}

export function addMonths(d: Date, months: number): Date {
  const out = new Date(d)
  out.setMonth(out.getMonth() + months)
  return out
}

export function formatUSD(n: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact && Math.abs(n) >= 10_000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatMonthLabel(monthIndex: number): string {
  const d = addMonths(new Date(), monthIndex)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}
