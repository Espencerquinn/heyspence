import type { Coin } from './coins'
import type { SellPlan } from './scenarios'

export interface ForecastInputs {
  coin: Coin
  holdingsUnits: number
  /** Used for fixed-rate plans; ignored otherwise. */
  unitsPerMonth: number
  /** Per-ounce spot price for each of the next N months. */
  monthlySpotPerOz: number[]
  /** Dollars per oz the dealer pays above spot when you sell. */
  dealerPremiumPerOz: number
  /** Strategy that decides how many units to sell each month. Defaults
   *  to fixed-rate (consume `unitsPerMonth`) when omitted. */
  plan?: SellPlan
  /** Calendar month the plan begins. Used for the liquidation date and
   *  month labels. Defaults to the current month when omitted. */
  startDate?: Date
}

export interface MonthRow {
  monthIndex: number
  spotPerOz: number
  pricePerCoin: number
  unitsSold: number
  inventoryAfter: number
  proceedsThisMonth: number
  cumulativeProceeds: number
}

export interface ForecastResult {
  rows: MonthRow[]
  totalProceeds: number
  totalUnitsSold: number
  monthsToLiquidate: number
  averagePricePerCoin: number
  finalLiquidationDate: Date | null
}

/**
 * Simulate the sale month-by-month. Sell quantity per month is decided
 * by the scenario's `plan`:
 *   • fixed-rate    → constant unitsPerMonth (legacy behavior)
 *   • bengen N%     → derived from initial USD value ÷ current price
 *   • price-tiers   → tier fires the first month spot crosses its trigger
 *
 * Stops when inventory hits zero or when 480 months elapse (hard cap to
 * prevent silly inputs from looping forever).
 */
export function simulate(inputs: ForecastInputs): ForecastResult {
  const {
    coin,
    holdingsUnits,
    unitsPerMonth,
    monthlySpotPerOz,
    dealerPremiumPerOz,
    plan = { kind: 'fixed-rate' as const },
    startDate,
  } = inputs

  const rows: MonthRow[] = []
  const initialHoldings = Math.max(0, Math.floor(holdingsUnits))
  let inventory = initialHoldings
  let cumulative = 0

  const fixedRate = Math.max(0, Math.floor(unitsPerMonth))
  const MAX_MONTHS = 480

  // Initial USD value of the stack — Bengen anchors withdrawals here.
  const month0Spot = monthlySpotPerOz[0] ?? 0
  const initialValueUSD = initialHoldings * (month0Spot + dealerPremiumPerOz) * coin.troyOz

  // Track which price tiers have already fired (one-shot per tier).
  const firedTiers = new Set<number>()

  let i = 0
  while (inventory > 0 && i < MAX_MONTHS) {
    const spot = monthlySpotPerOz[i] ?? monthlySpotPerOz[monthlySpotPerOz.length - 1] ?? 0
    const pricePerCoin = (spot + dealerPremiumPerOz) * coin.troyOz

    const requested = unitsThisMonth({
      plan,
      fixedRate,
      pricePerCoin,
      initialValueUSD,
      initialHoldings,
      spot,
      firedTiers,
    })

    if (requested <= 0) {
      // Don't append rows where nothing happens — that would pad the
      // chart with zero-proceed months indefinitely. Bail early.
      // Exception: price-tiers plans may legitimately go many months
      // before a tier fires; we still need to walk those months so the
      // chart shows the plateau and the tier eventually trips.
      if (plan.kind === 'price-tiers') {
        rows.push({
          monthIndex: i,
          spotPerOz: spot,
          pricePerCoin,
          unitsSold: 0,
          inventoryAfter: inventory,
          proceedsThisMonth: 0,
          cumulativeProceeds: cumulative,
        })
        i += 1
        continue
      }
      break
    }

    const unitsSold = Math.min(requested, inventory)
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
    inventory === 0 && rows.length > 0 ? addMonths(startDate ?? new Date(), rows.length) : null

  return {
    rows,
    totalProceeds: cumulative,
    totalUnitsSold,
    monthsToLiquidate: inventory === 0 ? rows.length : 0,
    averagePricePerCoin,
    finalLiquidationDate,
  }
}

interface UnitsThisMonthCtx {
  plan: SellPlan
  fixedRate: number
  pricePerCoin: number
  initialValueUSD: number
  initialHoldings: number
  spot: number
  firedTiers: Set<number>
}

function unitsThisMonth(ctx: UnitsThisMonthCtx): number {
  switch (ctx.plan.kind) {
    case 'fixed-rate':
      return ctx.fixedRate

    case 'bengen': {
      // Bengen withdraws a fixed $ amount per month, anchored to the
      // initial portfolio value. Convert that $ amount to units at the
      // current price.
      const monthlyDollars = (ctx.initialValueUSD * (ctx.plan.annualPct / 100)) / 12
      if (ctx.pricePerCoin <= 0) return 0
      return Math.max(1, Math.round(monthlyDollars / ctx.pricePerCoin))
    }

    case 'price-tiers': {
      let units = 0
      ctx.plan.tiers.forEach((tier, idx) => {
        if (!ctx.firedTiers.has(idx) && ctx.spot >= tier.spotTrigger) {
          units += Math.max(1, Math.ceil(ctx.initialHoldings * (tier.sellPct / 100)))
          ctx.firedTiers.add(idx)
        }
      })
      return units
    }
  }
}

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

export function formatMonthLabel(monthIndex: number, start?: Date): string {
  const d = addMonths(start ?? new Date(), monthIndex)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}
