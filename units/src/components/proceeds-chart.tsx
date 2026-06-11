import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { ForecastResult } from '../lib/forecast'
import { formatMonthLabel, formatUSD } from '../lib/forecast'

export interface ChartScenario {
  id: string
  name: string
  color: string
  result: ForecastResult
}

interface Props {
  scenarios: ChartScenario[]
  activeId: string
}

export function ProceedsChart({ scenarios, activeId }: Props) {
  const active = scenarios.find((s) => s.id === activeId) ?? scenarios[0]

  // X-axis spans the longest scenario so a slow plan doesn't get cut off.
  // After a scenario finishes, hold its cumulative flat at the final value.
  const maxMonths = Math.max(0, ...scenarios.map((s) => s.result.monthsToLiquidate))

  const data = Array.from({ length: Math.max(1, maxMonths) }, (_, i) => {
    const row: Record<string, number | string> = {
      monthIdx: i,
      label: formatMonthLabel(i),
    }
    for (const s of scenarios) {
      const r = s.result.rows[i]
      row[`cum_${s.id}`] = r ? r.cumulativeProceeds : s.result.totalProceeds
    }
    // Inventory shown for the active scenario only — overlaying multiple
    // would muddy the picture and they're already comparable via the
    // cumulative lines.
    if (active) {
      const r = active.result.rows[i]
      row.inventory = r ? r.inventoryAfter : 0
    }
    return row
  })

  const scenarioById = new Map(scenarios.map((s) => [s.id, s]))

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Sale curve</h3>
        <p className="text-[11px] text-zinc-500">
          Inventory shown for active scenario ({active?.name ?? '—'}).
        </p>
      </div>
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="invFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a3a3a3" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#a3a3a3" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              yAxisId="left"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={56}
              label={{
                value: 'Units left',
                angle: -90,
                position: 'insideLeft',
                fill: 'rgba(255,255,255,0.45)',
                fontSize: 10,
                dy: 24,
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v) => formatUSD(v as number, { compact: true })}
            />
            <Tooltip
              cursor={{ stroke: 'rgba(255,255,255,0.2)' }}
              formatter={(value, _name, item) => {
                const num = typeof value === 'number' ? value : 0
                const key = item && typeof item.dataKey === 'string' ? item.dataKey : ''
                if (key.startsWith('cum_')) {
                  const s = scenarioById.get(key.slice(4))
                  return [formatUSD(num), s ? `${s.name} · $` : 'Cumulative $']
                }
                if (key === 'inventory') {
                  return [Math.round(num).toLocaleString(), 'Units left (active)']
                }
                return [String(value), String(_name)]
              }}
              labelFormatter={(label) => label as string}
              contentStyle={{
                background: 'rgba(20,20,20,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
              }}
            />
            <Legend verticalAlign="top" height={28} iconType="line" wrapperStyle={{ fontSize: 11 }} />

            <Area
              yAxisId="left"
              type="monotone"
              dataKey="inventory"
              stroke="#a3a3a3"
              strokeWidth={1.5}
              fill="url(#invFill)"
              name="Units left (active)"
              isAnimationActive={false}
            />

            {scenarios.map((s) => (
              <Line
                key={s.id}
                yAxisId="right"
                type="monotone"
                dataKey={`cum_${s.id}`}
                stroke={s.color}
                strokeWidth={s.id === activeId ? 2.75 : 2}
                strokeDasharray={s.id === activeId ? undefined : '4 3'}
                dot={false}
                name={s.name}
                isAnimationActive={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
