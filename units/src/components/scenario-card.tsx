import type { ForecastResult } from '../lib/forecast'
import { formatUSD } from '../lib/forecast'

interface Props {
  name: string
  color: string
  unitsPerMonth: number
  result: ForecastResult
  isActive: boolean
  /** Short label for the underlying strategy (e.g. "Bengen 4%"). Hidden
   *  when it's the default fixed-rate plan. */
  planLabel?: string
  /** When provided, this scenario is compared against the baseline and
   *  deltas are shown next to each numeric row. */
  baseline?: ForecastResult
  onClick?: () => void
}

export function ScenarioCard({
  name,
  color,
  unitsPerMonth,
  result,
  isActive,
  planLabel,
  baseline,
  onClick,
}: Props) {
  const months = result.monthsToLiquidate
  const finalDate = result.finalLiquidationDate

  const proceedsDelta = baseline ? result.totalProceeds - baseline.totalProceeds : 0
  const avgDelta = baseline ? result.averagePricePerCoin - baseline.averagePricePerCoin : 0
  const monthsDelta = baseline ? result.monthsToLiquidate - baseline.monthsToLiquidate : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col rounded-md border p-4 text-left transition ${
        isActive
          ? 'border-white/40 bg-white/[0.05] shadow-[0_0_0_1px_rgba(255,255,255,0.18)]'
          : 'border-white/10 bg-white/[0.02] hover:border-white/25'
      }`}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          {name}
          {isActive && (
            <span className="rounded-sm bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-300">
              Active
            </span>
          )}
        </span>
        <span className="font-mono text-xs text-zinc-500">
          {planLabel && planLabel !== 'Fixed rate'
            ? planLabel
            : `${unitsPerMonth.toLocaleString()}/mo`}
        </span>
      </div>
      <div className="space-y-1.5">
        <Row
          label="Total proceeds"
          value={formatUSD(result.totalProceeds)}
          bold
          delta={baseline && !isActive ? formatDeltaUSD(proceedsDelta) : null}
          deltaPositive={proceedsDelta >= 0}
        />
        <Row
          label="Avg $/unit"
          value={formatUSD(result.averagePricePerCoin)}
          delta={baseline && !isActive ? formatDeltaUSD(avgDelta) : null}
          deltaPositive={avgDelta >= 0}
        />
        <Row
          label="Months to sell out"
          value={result.liquidated ? `${months}` : `${Math.floor(result.rows.length / 12)}y+ (not sold out)`}
          // Months delta only makes sense when both plans actually sell out.
          delta={
            baseline && !isActive && result.liquidated && baseline.liquidated
              ? formatDeltaMonths(monthsDelta)
              : null
          }
          // Fewer months is "good" in most users' minds, so flip the color.
          deltaPositive={monthsDelta <= 0}
        />
        <Row
          label="Liquidation date"
          value={
            finalDate
              ? finalDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              : '—'
          }
        />
      </div>
    </button>
  )
}

function Row({
  label,
  value,
  bold,
  delta,
  deltaPositive,
}: {
  label: string
  value: string
  bold?: boolean
  delta?: string | null
  deltaPositive?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span
          className={`font-mono tabular-nums ${
            bold ? 'text-base font-semibold text-zinc-100' : 'text-zinc-200'
          }`}
        >
          {value}
        </span>
        {delta && (
          <span
            className={`font-mono text-[11px] tabular-nums ${
              deltaPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {delta}
          </span>
        )}
      </span>
    </div>
  )
}

function formatDeltaUSD(n: number): string {
  if (n === 0) return '±$0'
  const sign = n > 0 ? '+' : '−'
  return `${sign}${formatUSD(Math.abs(n), { compact: true })}`
}

function formatDeltaMonths(n: number): string {
  if (n === 0) return '±0 mo'
  const sign = n > 0 ? '+' : '−'
  return `${sign}${Math.abs(n)} mo`
}
