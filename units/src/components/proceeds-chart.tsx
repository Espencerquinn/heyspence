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

interface Props {
  result: ForecastResult
}

export function ProceedsChart({ result }: Props) {
  const data = result.rows.map((r) => ({
    monthIdx: r.monthIndex,
    label: formatMonthLabel(r.monthIndex),
    inventory: r.inventoryAfter,
    cumulative: r.cumulativeProceeds,
    spot: r.spotPerOz,
  }))

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] p-4">
      <h3 className="mb-3 text-sm font-semibold">Sale curve</h3>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="invFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a3a3a3" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#a3a3a3" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.04} />
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
              formatter={(value: number | string, name: string) => {
                const num = typeof value === 'number' ? value : 0
                if (name === 'cumulative') return [formatUSD(num), 'Cumulative $']
                if (name === 'inventory') return [Math.round(num).toLocaleString(), 'Units left']
                if (name === 'spot') return [`$${num.toFixed(2)}/oz`, 'Spot']
                return [String(value), name]
              }}
              labelFormatter={(label) => label as string}
            />
            <Legend
              verticalAlign="top"
              height={28}
              iconType="line"
              wrapperStyle={{ fontSize: 11 }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="inventory"
              stroke="#a3a3a3"
              strokeWidth={2}
              fill="url(#invFill)"
              name="Units left"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              stroke="#22d3ee"
              strokeWidth={2.5}
              dot={false}
              name="Cumulative $"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
