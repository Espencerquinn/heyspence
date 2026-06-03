import type { ForecastResult } from '../lib/forecast'
import { formatUSD } from '../lib/forecast'

interface Props {
  label: string
  unitsPerMonth: number
  result: ForecastResult
  highlight?: boolean
}

export function ScenarioCard({ label, unitsPerMonth, result, highlight }: Props) {
  const months = result.monthsToLiquidate
  const finalDate = result.finalLiquidationDate
  return (
    <div
      className={`flex flex-col rounded-md border p-4 transition ${
        highlight
          ? 'border-cyan-400/60 bg-cyan-400/[0.05] shadow-[0_0_0_1px_rgba(34,211,238,0.18)]'
          : 'border-white/10 bg-white/[0.02]'
      }`}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {label}
        </span>
        <span className="font-mono text-xs text-zinc-500">
          {unitsPerMonth.toLocaleString()}/mo
        </span>
      </div>
      <div className="space-y-1.5">
        <Row label="Total proceeds" value={formatUSD(result.totalProceeds)} bold />
        <Row label="Avg $/unit" value={formatUSD(result.averagePricePerCoin)} />
        <Row
          label="Months to sell out"
          value={months === 0 ? '—' : `${months}`}
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
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-zinc-400">{label}</span>
      <span
        className={`font-mono tabular-nums ${
          bold ? 'text-zinc-100 text-base font-semibold' : 'text-zinc-200'
        }`}
      >
        {value}
      </span>
    </div>
  )
}
