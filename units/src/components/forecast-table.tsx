import { useState } from 'react'
import { formatMonthLabel } from '../lib/forecast'

interface Props {
  monthlySpot: number[]
  onChange: (next: number[]) => void
  /** How many months from the table to render. We always keep a longer
   *  array under the hood so growth assumptions reach far into the future. */
  visibleMonths: number
  /** Calendar month the plan starts; drives the per-cell month labels. */
  start?: Date
  /** Heading text (defaults to a generic label). */
  title?: string
}

/**
 * Per-month spot-price editor. Defaults are populated by the parent
 * (today's spot × annual growth assumption). User can override any cell.
 * Edits propagate immediately.
 */
export function ForecastTable({ monthlySpot, onChange, visibleMonths, start, title }: Props) {
  const [expanded, setExpanded] = useState(false)
  const initial = expanded ? Math.min(visibleMonths, monthlySpot.length) : Math.min(12, visibleMonths)
  const rows = monthlySpot.slice(0, initial)

  function update(idx: number, val: number) {
    const next = [...monthlySpot]
    next[idx] = val
    onChange(next)
  }

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title ?? 'Monthly spot forecast'}</h3>
        <button
          type="button"
          className="text-xs text-zinc-400 underline-offset-4 hover:text-zinc-100 hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Collapse' : `Show all ${visibleMonths} months`}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((spot, i) => (
          <label key={i} className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              {formatMonthLabel(i, start)}
            </span>
            <div className="flex items-center rounded border border-white/10 bg-white/5 px-2.5 py-1.5">
              <span className="mr-1 text-xs text-zinc-500">$</span>
              <input
                type="number"
                step="0.01"
                value={spot.toFixed(2)}
                onChange={(e) => update(i, parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent text-sm font-mono tabular-nums text-zinc-100 outline-none"
              />
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
