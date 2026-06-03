import { useEffect, useMemo, useState } from 'react'
import { COINS, getCoin } from '../lib/coins'
import {
  buildLinearForecast,
  formatUSD,
  simulate,
  type ForecastResult,
} from '../lib/forecast'
import { fetchSilverSpot, type SilverSpot } from '../lib/api'
import { storageClearAll, storageGet, storageSet } from '../lib/storage'
import { ForecastTable } from './forecast-table'
import { ProceedsChart } from './proceeds-chart'
import { ScenarioCard } from './scenario-card'

// ─── Defaults ──────────────────────────────────────────────────────

const DEFAULTS = {
  coinId: 'csml-1oz',
  holdingsUnits: 1000,
  unitsPerMonth: 50,
  todaysSpot: 75.0, // Best static guess for first paint; live API overrides
  annualGrowthPct: 8,
  dealerPremiumPerOz: 1.25,
  forecastMonths: 120, // 10 years of forecast horizon
}

// ─── State persistence ────────────────────────────────────────────

interface SavedState {
  coinId: string
  holdingsUnits: number
  unitsPerMonth: number
  todaysSpot: number
  annualGrowthPct: number
  dealerPremiumPerOz: number
  /** Monthly spot prices the user has manually adjusted. If empty,
   *  derived from todaysSpot × annualGrowthPct on render. */
  monthlySpotOverrides: number[]
}

function loadState(): SavedState {
  return {
    coinId: storageGet('coinId', DEFAULTS.coinId),
    holdingsUnits: storageGet('holdingsUnits', DEFAULTS.holdingsUnits),
    unitsPerMonth: storageGet('unitsPerMonth', DEFAULTS.unitsPerMonth),
    todaysSpot: storageGet('todaysSpot', DEFAULTS.todaysSpot),
    annualGrowthPct: storageGet('annualGrowthPct', DEFAULTS.annualGrowthPct),
    dealerPremiumPerOz: storageGet('dealerPremiumPerOz', DEFAULTS.dealerPremiumPerOz),
    monthlySpotOverrides: storageGet<number[]>('monthlySpotOverrides', []),
  }
}

function saveState(s: SavedState): void {
  storageSet('coinId', s.coinId)
  storageSet('holdingsUnits', s.holdingsUnits)
  storageSet('unitsPerMonth', s.unitsPerMonth)
  storageSet('todaysSpot', s.todaysSpot)
  storageSet('annualGrowthPct', s.annualGrowthPct)
  storageSet('dealerPremiumPerOz', s.dealerPremiumPerOz)
  storageSet('monthlySpotOverrides', s.monthlySpotOverrides)
}

// ─── Component ────────────────────────────────────────────────────

export function SellPlanner() {
  const [state, setState] = useState<SavedState>(() => loadState())
  const [live, setLive] = useState<SilverSpot | null>(null)
  const [liveStatus, setLiveStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle')

  // Persist every change
  useEffect(() => {
    saveState(state)
  }, [state])

  // Pull live silver spot on first mount
  useEffect(() => {
    const ctl = new AbortController()
    setLiveStatus('loading')
    fetchSilverSpot(ctl.signal).then((s) => {
      if (s) {
        setLive(s)
        setLiveStatus('ok')
      } else {
        setLiveStatus('fail')
      }
    })
    return () => ctl.abort()
  }, [])

  const coin = getCoin(state.coinId)

  // Forecast array: use user overrides where present, otherwise the
  // linear-growth default. We always extend to forecastMonths length.
  const monthlySpot = useMemo(() => {
    const base = buildLinearForecast(state.todaysSpot, state.annualGrowthPct, DEFAULTS.forecastMonths)
    for (let i = 0; i < state.monthlySpotOverrides.length && i < base.length; i++) {
      const v = state.monthlySpotOverrides[i]
      if (typeof v === 'number' && isFinite(v) && v > 0) {
        base[i] = v
      }
    }
    return base
  }, [state.todaysSpot, state.annualGrowthPct, state.monthlySpotOverrides])

  const inputs = {
    coin,
    holdingsUnits: state.holdingsUnits,
    unitsPerMonth: state.unitsPerMonth,
    monthlySpotPerOz: monthlySpot,
    dealerPremiumPerOz: state.dealerPremiumPerOz,
  }

  const result: ForecastResult = useMemo(() => simulate(inputs), [
    inputs.coin.id,
    inputs.holdingsUnits,
    inputs.unitsPerMonth,
    inputs.dealerPremiumPerOz,
    monthlySpot,
  ])

  // Comparison scenarios — half rate / current / double rate
  const halfRate = Math.max(1, Math.round(state.unitsPerMonth / 2))
  const doubleRate = state.unitsPerMonth * 2
  const slow = useMemo(
    () => simulate({ ...inputs, unitsPerMonth: halfRate }),
    [inputs.coin.id, inputs.holdingsUnits, inputs.dealerPremiumPerOz, monthlySpot, halfRate],
  )
  const fast = useMemo(
    () => simulate({ ...inputs, unitsPerMonth: doubleRate }),
    [inputs.coin.id, inputs.holdingsUnits, inputs.dealerPremiumPerOz, monthlySpot, doubleRate],
  )

  function update<K extends keyof SavedState>(key: K, value: SavedState[K]) {
    setState((s) => ({ ...s, [key]: value }))
  }

  // Snap the timeline (and thus the implied rate) to a preset.
  // Clamps to at least 1 unit/month so a small-holdings + long-timeline
  // combination still produces a sane forecast.
  function setMonths(m: number) {
    const newRate = Math.max(1, Math.ceil(state.holdingsUnits / m))
    update('unitsPerMonth', newRate)
  }

  function applyLiveSpot() {
    if (!live) return
    update('todaysSpot', Math.round(live.pricePerOz * 100) / 100)
    // Clear any manual overrides since the baseline shifted
    update('monthlySpotOverrides', [])
  }

  function resetDefaults() {
    if (!confirm('Reset every input to defaults? Your saved settings will be cleared.')) return
    storageClearAll()
    setState({
      coinId: DEFAULTS.coinId,
      holdingsUnits: DEFAULTS.holdingsUnits,
      unitsPerMonth: DEFAULTS.unitsPerMonth,
      todaysSpot: DEFAULTS.todaysSpot,
      annualGrowthPct: DEFAULTS.annualGrowthPct,
      dealerPremiumPerOz: DEFAULTS.dealerPremiumPerOz,
      monthlySpotOverrides: [],
    })
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:py-14">
      {/* ─── Header ────────────────────────────────────── */}
      <header className="mb-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
            heyspence.me · units
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Sale Planner
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-400">
            Model when and how fast to liquidate. Tweak the assumptions on the
            left, watch total proceeds, average price, and runway shift on the
            right.
          </p>
        </div>
        <button
          onClick={resetDefaults}
          className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
        >
          Reset to defaults
        </button>
      </header>

      {/* ─── Top KPI row ───────────────────────────────── */}
      <KpiStrip result={result} coinName={coin.name} />

      {/* ─── Inputs ───────────────────────────────────── */}
      <section className="mt-8 grid gap-4 rounded-md border border-white/10 bg-white/[0.02] p-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Coin">
          <select
            value={state.coinId}
            onChange={(e) => update('coinId', e.target.value)}
            className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-zinc-100"
          >
            {COINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-zinc-500">{coin.premiumNote}</p>
        </Field>

        <Field label="Holdings (units)">
          <NumberInput
            value={state.holdingsUnits}
            onChange={(v) => update('holdingsUnits', Math.max(0, Math.round(v)))}
            step={10}
          />
        </Field>

        <Field label={`Sell rate · ${state.unitsPerMonth.toLocaleString()}/mo`}>
          <input
            type="range"
            min={1}
            max={Math.max(50, state.holdingsUnits || 1000)}
            step={1}
            value={state.unitsPerMonth}
            onChange={(e) => update('unitsPerMonth', parseInt(e.target.value, 10))}
            className="w-full accent-cyan-400"
          />
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>1 / mo</span>
            <span>{Math.max(50, state.holdingsUnits || 1000).toLocaleString()} / mo</span>
          </div>
        </Field>

        {/* Two-way link with the sell rate. Editing months recomputes
            units/month so user can think in either dimension. */}
        <Field label="Sell over (months)">
          <div className="flex items-stretch gap-2">
            <NumberInput
              value={impliedMonths(state.holdingsUnits, state.unitsPerMonth)}
              onChange={(v) => {
                const m = Math.max(1, Math.round(v))
                const newRate = Math.max(1, Math.ceil(state.holdingsUnits / m))
                update('unitsPerMonth', newRate)
              }}
              step={1}
            />
            <PresetButton label="6 mo" onClick={() => setMonths(6)} />
            <PresetButton label="12 mo" onClick={() => setMonths(12)} />
            <PresetButton label="24 mo" onClick={() => setMonths(24)} />
          </div>
          <p className="text-[11px] text-zinc-500">
            How long until the last unit is sold. Linked to the sell rate above.
          </p>
        </Field>

        <Field label="Today's silver spot ($/oz)">
          <div className="flex items-stretch gap-2">
            <NumberInput
              value={state.todaysSpot}
              onChange={(v) => {
                update('todaysSpot', v)
                update('monthlySpotOverrides', []) // baseline shifted
              }}
              step={0.5}
            />
            <button
              type="button"
              onClick={applyLiveSpot}
              disabled={liveStatus !== 'ok'}
              className="shrink-0 whitespace-nowrap rounded-md border border-white/15 px-2.5 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              title={live ? `Live: $${live.pricePerOz.toFixed(2)}` : 'Live price unavailable'}
            >
              {liveStatus === 'loading'
                ? 'Loading…'
                : liveStatus === 'ok'
                  ? `Use live $${live!.pricePerOz.toFixed(2)}`
                  : 'Live unavailable'}
            </button>
          </div>
          {live && liveStatus === 'ok' && (
            <p className="text-[11px] text-zinc-500">
              Live: ${live.pricePerOz.toFixed(2)}/oz · {live.source}
            </p>
          )}
          {liveStatus === 'fail' && (
            <p className="text-[11px] text-zinc-500">
              Live price unavailable — enter manually from Monex / Kitco.
            </p>
          )}
        </Field>

        <Field label="Annual price growth assumption (%)">
          <NumberInput
            value={state.annualGrowthPct}
            onChange={(v) => {
              update('annualGrowthPct', v)
              update('monthlySpotOverrides', [])
            }}
            step={1}
          />
          <p className="text-[11px] text-zinc-500">
            Compounds monthly. Used to seed the forecast table below.
          </p>
        </Field>

        <Field label="Dealer premium over spot ($/oz)">
          <NumberInput
            value={state.dealerPremiumPerOz}
            onChange={(v) => update('dealerPremiumPerOz', v)}
            step={0.25}
          />
          <p className="text-[11px] text-zinc-500">
            What the dealer pays you above spot when you sell.
          </p>
        </Field>
      </section>

      {/* ─── Forecast table ───────────────────────────── */}
      <section className="mt-6">
        <ForecastTable
          monthlySpot={monthlySpot}
          onChange={(next) => update('monthlySpotOverrides', next)}
          visibleMonths={Math.min(60, Math.max(result.monthsToLiquidate + 6, 24))}
        />
      </section>

      {/* ─── Chart ────────────────────────────────────── */}
      <section className="mt-6">
        <ProceedsChart result={result} />
      </section>

      {/* ─── Scenario comparison ───────────────────────── */}
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <ScenarioCard
          label={`Slower · ${halfRate.toLocaleString()}/mo`}
          unitsPerMonth={halfRate}
          result={slow}
        />
        <ScenarioCard
          label="Spencer's plan"
          unitsPerMonth={state.unitsPerMonth}
          result={result}
          highlight
        />
        <ScenarioCard
          label={`Faster · ${doubleRate.toLocaleString()}/mo`}
          unitsPerMonth={doubleRate}
          result={fast}
        />
      </section>

      <footer className="mt-12 text-center text-[11px] text-zinc-500">
        Settings persist in this browser. Reset clears everything.
      </footer>
    </div>
  )
}

// ─── Bits ────────────────────────────────────────────────────────

function KpiStrip({ result, coinName }: { result: ForecastResult; coinName: string }) {
  const months = result.monthsToLiquidate
  return (
    <section className="grid gap-3 sm:grid-cols-4">
      <Kpi label="Total proceeds" value={formatUSD(result.totalProceeds)} accent />
      <Kpi label="Avg price / unit" value={formatUSD(result.averagePricePerCoin)} />
      <Kpi
        label="Months to sell out"
        value={months === 0 ? '—' : months.toString()}
      />
      <Kpi
        label="Liquidation date"
        value={
          result.finalLiquidationDate
            ? result.finalLiquidationDate.toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })
            : '—'
        }
      />
      <p className="col-span-full -mt-1 text-[11px] text-zinc-500">
        Modeling: {coinName} · {result.totalUnitsSold.toLocaleString()} units sold
      </p>
    </section>
  )
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-md border px-4 py-3 ${
        accent ? 'border-cyan-400/40 bg-cyan-400/[0.06]' : 'border-white/10 bg-white/[0.02]'
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="mt-1 font-mono text-xl tabular-nums">{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  )
}

function NumberInput({
  value,
  onChange,
  step = 1,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-mono tabular-nums text-zinc-100"
    />
  )
}

function PresetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-md border border-white/15 px-2.5 text-xs text-zinc-300 hover:bg-white/5"
    >
      {label}
    </button>
  )
}

/** Months it would take to sell out at the given monthly rate. Rounds
 *  up so a residual partial month still shows as a whole month. */
function impliedMonths(holdings: number, ratePerMonth: number): number {
  if (ratePerMonth <= 0 || holdings <= 0) return 0
  return Math.ceil(holdings / ratePerMonth)
}
