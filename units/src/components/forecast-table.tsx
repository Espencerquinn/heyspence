import { useEffect, useState } from 'react'
import { formatMonthLabel } from '../lib/forecast'

interface Props {
  monthlySpot: number[]
  /** Override a single month's spot price. Only the edited month is stored,
   *  so untouched months keep following the growth assumption. */
  onEdit: (index: number, value: number) => void
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
export function ForecastTable({ monthlySpot, onEdit, visibleMonths, start, title }: Props) {
  const [expanded, setExpanded] = useState(false)
  const initial = expanded ? Math.min(visibleMonths, monthlySpot.length) : Math.min(12, visibleMonths)
  const rows = monthlySpot.slice(0, initial)

  function update(idx: number, val: number) {
    onEdit(idx, val)
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
          <SpotCell key={i} label={formatMonthLabel(i, start)} value={spot} onCommit={(v) => update(i, v)} />
        ))}
      </div>
    </div>
  )
}

/**
 * A single editable spot-price cell. Holds the in-progress text locally and
 * only commits on blur / Enter, so typing doesn't reformat mid-edit (which
 * caused the caret to jump). Syncs to the incoming value when not focused.
 */
function SpotCell({
  label,
  value,
  onCommit,
}: {
  label: string
  value: number
  onCommit: (v: number) => void
}) {
  const [text, setText] = useState(value.toFixed(2))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(value.toFixed(2))
  }, [value, focused])

  function commit() {
    const v = parseFloat(text)
    if (isFinite(v) && v > 0) onCommit(v)
    else setText(value.toFixed(2))
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      <div className="flex items-center rounded border border-white/10 bg-white/5 px-2.5 py-1.5">
        <span className="mr-1 text-xs text-zinc-500">$</span>
        <input
          type="number"
          step="0.01"
          value={text}
          onFocus={() => setFocused(true)}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => { setFocused(false); commit() }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className="w-full bg-transparent text-sm font-mono tabular-nums text-zinc-100 outline-none"
        />
      </div>
    </label>
  )
}
