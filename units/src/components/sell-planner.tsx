import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { COINS, getCoin } from '../lib/coins'
import {
  buildLinearForecast,
  formatUSD,
  simulate,
  type ForecastResult,
} from '../lib/forecast'
import { fetchSilverSpot, type SilverSpot } from '../lib/api'
import { storageClearAll, storageSet } from '../lib/storage'
import {
  duplicateScenario,
  loadInitialScenarios,
  newScenarioId,
  planLabel,
  planOf,
  PRESETS,
  SCENARIO_COLORS,
  scenarioFromPreset,
  type Scenario,
  type ScenarioPreset,
} from '../lib/scenarios'
import { ForecastTable } from './forecast-table'
import type { ChartScenario } from './proceeds-chart'

// Recharts is heavy and the chart is below the fold — load it on demand.
const ProceedsChart = lazy(() =>
  import('./proceeds-chart').then((m) => ({ default: m.ProceedsChart })),
)
import { ScenarioBar } from './scenario-bar'
import { ScenarioCard } from './scenario-card'

const FORECAST_MONTHS = 480 // 40-yr horizon — matches simulator MAX_MONTHS so slow plans don't flatline

export function SellPlanner() {
  const initial = useMemo(loadInitialScenarios, [])
  const [scenarios, setScenarios] = useState<Scenario[]>(initial.scenarios)
  const [activeId, setActiveId] = useState<string>(initial.activeId)
  const [visibleIds, setVisibleIds] = useState<string[]>(initial.visibleIds)

  const [live, setLive] = useState<SilverSpot | null>(null)
  const [liveStatus, setLiveStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle')

  // Persist scenario list + selection on every change
  useEffect(() => {
    storageSet('scenarios', scenarios)
    storageSet('activeScenarioId', activeId)
    storageSet('visibleScenarioIds', visibleIds)
  }, [scenarios, activeId, visibleIds])

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

  const active = scenarios.find((s) => s.id === activeId) ?? scenarios[0]
  const activeCoin = getCoin(active.coinId)

  // Calendar month the liquidation plan begins — drives the month labels on
  // the table/chart and the projected liquidation date. Defaults to this month.
  const [startMonth, setStartMonth] = useState<Date>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  // Compute the monthly spot series for any scenario.
  function monthlySpotFor(s: Scenario): number[] {
    const base = buildLinearForecast(s.todaysSpot, s.annualGrowthPct, FORECAST_MONTHS)
    for (let i = 0; i < s.monthlySpotOverrides.length && i < base.length; i++) {
      const v = s.monthlySpotOverrides[i]
      if (typeof v === 'number' && isFinite(v) && v > 0) base[i] = v
    }
    return base
  }

  // Forecasts for every scenario, memoized on a stringified scenario list so
  // edits propagate without us hand-listing every dependency.
  const cacheRef = useRef<Map<string, { sig: string; result: ForecastResult }>>(new Map())
  const results = useMemo<Record<string, ForecastResult>>(() => {
    const out: Record<string, ForecastResult> = {}
    for (const s of scenarios) {
      // Only re-simulate a scenario when its own inputs (or the start month)
      // change — editing one scenario no longer recomputes all of them.
      const sig = JSON.stringify([
        s.coinId, s.holdingsUnits, s.unitsPerMonth, s.dealerPremiumPerOz,
        s.todaysSpot, s.annualGrowthPct, s.monthlySpotOverrides, s.plan,
        startMonth.getTime(),
      ])
      const cached = cacheRef.current.get(s.id)
      if (cached && cached.sig === sig) {
        out[s.id] = cached.result
      } else {
        const result = simulate({
          coin: getCoin(s.coinId),
          holdingsUnits: s.holdingsUnits,
          unitsPerMonth: s.unitsPerMonth,
          monthlySpotPerOz: monthlySpotFor(s),
          dealerPremiumPerOz: s.dealerPremiumPerOz,
          plan: planOf(s),
          startDate: startMonth,
        })
        cacheRef.current.set(s.id, { sig, result })
        out[s.id] = result
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarios, startMonth])

  const activeResult = results[active.id]
  const activeMonthlySpot = useMemo(() => monthlySpotFor(active), [
    active.todaysSpot,
    active.annualGrowthPct,
    active.monthlySpotOverrides,
  ])

  // ─── Scenario mutations ──────────────────────────────────────────

  function updateActive<K extends keyof Scenario>(key: K, value: Scenario[K]) {
    setScenarios((prev) => prev.map((s) => (s.id === activeId ? { ...s, [key]: value } : s)))
  }

  function renameScenario(id: string, name: string) {
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)))
  }

  function addScenario() {
    const src = scenarios.find((s) => s.id === activeId) ?? scenarios[0]
    const copy = duplicateScenario(src, scenarios)
    setScenarios((prev) => [...prev, copy])
    setActiveId(copy.id)
    setVisibleIds((prev) => (prev.includes(copy.id) ? prev : [...prev, copy.id]))
  }

  function addFromPreset(preset: ScenarioPreset) {
    // Seed the preset from the active scenario so its holdings/coin/spot
    // assumptions feel like "another way to play THIS stack."
    const seed = {
      coinId: active.coinId,
      holdingsUnits: active.holdingsUnits,
      todaysSpot: active.todaysSpot,
      annualGrowthPct: active.annualGrowthPct,
      dealerPremiumPerOz: active.dealerPremiumPerOz,
    }
    const built = scenarioFromPreset(preset, seed, scenarios)
    setScenarios((prev) => [...prev, built])
    setActiveId(built.id)
    setVisibleIds((prev) => (prev.includes(built.id) ? prev : [...prev, built.id]))
  }

  function duplicate(id: string) {
    const src = scenarios.find((s) => s.id === id)
    if (!src) return
    const copy = duplicateScenario(src, scenarios)
    setScenarios((prev) => [...prev, copy])
    setVisibleIds((prev) => (prev.includes(copy.id) ? prev : [...prev, copy.id]))
  }

  function deleteScenario(id: string) {
    if (scenarios.length <= 1) return
    const remaining = scenarios.filter((s) => s.id !== id)
    setScenarios(remaining)
    if (activeId === id) setActiveId(remaining[0].id)
    setVisibleIds((prev) => prev.filter((vid) => vid !== id))
  }

  function toggleVisible(id: string) {
    setVisibleIds((prev) => {
      const has = prev.includes(id)
      // Always keep active visible — toggling it off would hide the
      // inventory area and confuse readers.
      if (has && id === activeId) return prev
      if (has) return prev.filter((x) => x !== id)
      return [...prev, id]
    })
  }

  function setMonths(m: number) {
    const newRate = Math.max(1, Math.ceil(active.holdingsUnits / m))
    updateActive('unitsPerMonth', newRate)
  }

  function applyLiveSpot() {
    if (!live) return
    updateActive('todaysSpot', Math.round(live.pricePerOz * 100) / 100)
    updateActive('monthlySpotOverrides', [])
  }

  const [confirmReset, setConfirmReset] = useState(false)
  function resetDefaults() {
    storageClearAll()
    const fresh: Scenario = {
      id: newScenarioId(),
      name: "Spencer's plan",
      color: SCENARIO_COLORS[0],
      coinId: 'csml-1oz',
      holdingsUnits: 1000,
      unitsPerMonth: 50,
      todaysSpot: 75.0,
      annualGrowthPct: 8,
      dealerPremiumPerOz: 1.25,
      monthlySpotOverrides: [],
      plan: { kind: 'fixed-rate' },
    }
    setScenarios([fresh])
    setActiveId(fresh.id)
    setVisibleIds([fresh.id])
  }

  // ─── Derived ─────────────────────────────────────────────────────

  const visibleScenarios = scenarios.filter((s) => visibleIds.includes(s.id))
  const chartScenarios: ChartScenario[] = visibleScenarios.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    result: results[s.id],
  }))

  const headlineCallouts = buildHeadlineCallouts(visibleScenarios, results, activeId)

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:py-14">
      {/* Header */}
      <header className="mb-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
            heyspence.me · units
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Sale Planner
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-400">
            Model when and how fast to liquidate. Build scenarios, overlay them
            on the sale curve, and see what changes when you change the plan.
          </p>
        </div>
        <button
          onClick={() => {
            if (confirmReset) { resetDefaults(); setConfirmReset(false) }
            else { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 4000) }
          }}
          className={`rounded-md border px-3 py-1.5 text-xs ${
            confirmReset
              ? 'border-red-500/60 text-red-300 hover:bg-red-500/10'
              : 'border-white/15 text-zinc-300 hover:bg-white/5'
          }`}
        >
          {confirmReset ? 'Click again to reset everything' : 'Reset to defaults'}
        </button>
      </header>

      {/* Top KPI row — shows active scenario */}
      <KpiStrip
        result={activeResult}
        coinName={activeCoin.name}
        scenarioName={active.name}
      />

      {/* Scenario picker */}
      <section className="mt-6">
        <ScenarioBar
          scenarios={scenarios}
          activeId={activeId}
          visibleIds={visibleIds}
          presets={PRESETS}
          onSelectActive={setActiveId}
          onToggleVisible={toggleVisible}
          onRename={renameScenario}
          onDuplicate={duplicate}
          onDelete={deleteScenario}
          onAdd={addScenario}
          onAddFromPreset={addFromPreset}
        />
      </section>

      {/* Inputs — edits the active scenario */}
      <section className="mt-4 grid gap-4 rounded-md border border-white/10 bg-white/[0.02] p-5 sm:grid-cols-2 lg:grid-cols-3">
        <p className="col-span-full -mb-1 text-[11px] text-zinc-500">
          Editing <span className="text-zinc-300">{active.name}</span>
          {' · '}
          <span className="rounded-sm bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-300">
            {planLabel(planOf(active))}
          </span>
          {' · '}
          changes flow into the chart and callouts below.
        </p>

        <Field label="Coin">
          <select
            value={active.coinId}
            onChange={(e) => updateActive('coinId', e.target.value)}
            className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-zinc-100"
          >
            {COINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-zinc-500">{activeCoin.premiumNote}</p>
        </Field>

        <Field label="Holdings (units)">
          <NumberInput
            value={active.holdingsUnits}
            onChange={(v) => updateActive('holdingsUnits', Math.max(0, Math.round(v)))}
            step={10}
          />
        </Field>

        <Field label="Liquidation start month">
          <input
            type="month"
            aria-label="Liquidation start month"
            value={`${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, '0')}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number)
              if (y && m) setStartMonth(new Date(y, m - 1, 1))
            }}
            className="w-full rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-sm text-zinc-100 outline-none [color-scheme:dark]"
          />
          <p className="text-[11px] text-zinc-500">
            When selling begins. Sets the month labels on the table and chart below.
          </p>
        </Field>

        {planOf(active).kind === 'fixed-rate' ? (
          <>
            <Field label={`Sell rate · ${active.unitsPerMonth.toLocaleString()}/mo`}>
              <input
                type="range"
                min={1}
                max={Math.max(50, active.holdingsUnits || 1000)}
                step={1}
                value={active.unitsPerMonth}
                onChange={(e) => updateActive('unitsPerMonth', parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400"
                aria-label="Sell rate (units per month)"
                aria-valuetext={`${active.unitsPerMonth} units per month`}
              />
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>1 / mo</span>
                <span>{Math.max(50, active.holdingsUnits || 1000).toLocaleString()} / mo</span>
              </div>
            </Field>

            <Field label="Sell over (months)">
              <div className="flex items-stretch gap-2">
                <NumberInput
                  value={impliedMonths(active.holdingsUnits, active.unitsPerMonth)}
                  onChange={(v) => {
                    const m = Math.max(1, Math.round(v))
                    const newRate = Math.max(1, Math.ceil(active.holdingsUnits / m))
                    updateActive('unitsPerMonth', newRate)
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
          </>
        ) : (
          <StrategyEditor scenario={active} onChange={setScenarios} scenarios={scenarios} />
        )}

        <Field label="Today's silver spot ($/oz)">
          <div className="flex items-stretch gap-2">
            <NumberInput
              value={active.todaysSpot}
              onChange={(v) => {
                updateActive('todaysSpot', v)
                updateActive('monthlySpotOverrides', [])
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
            value={active.annualGrowthPct}
            onChange={(v) => {
              updateActive('annualGrowthPct', v)
              updateActive('monthlySpotOverrides', [])
            }}
            step={1}
          />
          <p className="text-[11px] text-zinc-500">
            Compounds monthly. Used to seed the forecast table below.
          </p>
        </Field>

        <Field label="Dealer premium over spot ($/oz)">
          <NumberInput
            value={active.dealerPremiumPerOz}
            onChange={(v) => updateActive('dealerPremiumPerOz', v)}
            step={0.25}
          />
          <p className="text-[11px] text-zinc-500">
            What the dealer pays you above spot when you sell.
          </p>
        </Field>
      </section>

      {/* Forecast table — active scenario */}
      <section className="mt-6">
        <ForecastTable
          monthlySpot={activeMonthlySpot}
          onEdit={(index, value) => {
            // Store ONLY the edited month so the rest keep tracking the growth
            // curve (avoids freezing the whole forecast on a single edit).
            const next = active.monthlySpotOverrides.slice()
            next[index] = value
            updateActive('monthlySpotOverrides', next)
          }}
          start={startMonth}
          title={`${active.name} · monthly spot forecast`}
          visibleMonths={
            activeResult.monthsToLiquidate > 0
              ? Math.min(activeMonthlySpot.length, activeResult.monthsToLiquidate)
              : activeMonthlySpot.length
          }
        />
      </section>

      {/* Headline callouts — auto-generated from visible scenarios */}
      {headlineCallouts.length > 0 && (
        <section className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {headlineCallouts.map((c, i) => (
            <Callout key={i} {...c} />
          ))}
        </section>
      )}

      {/* Multi-scenario chart */}
      <section className="mt-6">
        <Suspense
          fallback={
            <div className="flex h-[360px] items-center justify-center rounded-md border border-white/10 bg-white/[0.02] text-sm text-zinc-500">
              Loading chart…
            </div>
          }
        >
          <ProceedsChart scenarios={chartScenarios} activeId={activeId} start={startMonth} />
        </Suspense>
      </section>

      {/* Scenario comparison cards */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleScenarios.map((s) => (
          <ScenarioCard
            key={s.id}
            name={s.name}
            color={s.color}
            unitsPerMonth={s.unitsPerMonth}
            result={results[s.id]}
            isActive={s.id === activeId}
            planLabel={planLabel(planOf(s))}
            baseline={s.id === activeId ? undefined : activeResult}
            onClick={() => setActiveId(s.id)}
          />
        ))}
      </section>

      <footer className="mt-12 text-center text-[11px] text-zinc-500">
        Settings persist in this browser. Reset clears everything.
      </footer>
    </div>
  )
}

// ─── Headline callouts ──────────────────────────────────────────────

interface CalloutProps {
  tone: 'good' | 'bad' | 'neutral'
  label: string
  detail: string
}

/** Walk the visible scenarios vs the active one and pull out the most
 *  punchy comparisons: best $$, fastest sell-out, slowest sell-out, etc.
 *  Returns at most 3 entries to keep the strip readable. */
function buildHeadlineCallouts(
  visible: Scenario[],
  results: Record<string, ForecastResult>,
  activeId: string,
): CalloutProps[] {
  if (visible.length < 2) return []
  const active = visible.find((s) => s.id === activeId)
  if (!active) return []
  const activeRes = results[active.id]

  const others = visible.filter((s) => s.id !== activeId)
  const out: CalloutProps[] = []

  // Best total proceeds
  const bestProceeds = others.reduce(
    (best, s) => (results[s.id].totalProceeds > results[best.id].totalProceeds ? s : best),
    others[0],
  )
  const proceedsDelta = results[bestProceeds.id].totalProceeds - activeRes.totalProceeds
  if (Math.abs(proceedsDelta) > 1) {
    out.push({
      tone: proceedsDelta > 0 ? 'good' : 'bad',
      label: `${bestProceeds.name} nets ${proceedsDelta > 0 ? '+' : '−'}${formatUSD(Math.abs(proceedsDelta), { compact: true })}`,
      detail: `vs ${active.name} · ${formatUSD(results[bestProceeds.id].totalProceeds)} total`,
    })
  }

  // Fastest sell-out
  const fastest = others.reduce(
    (best, s) =>
      results[s.id].monthsToLiquidate > 0 &&
      results[s.id].monthsToLiquidate < results[best.id].monthsToLiquidate
        ? s
        : best,
    others[0],
  )
  const monthsDelta = results[fastest.id].monthsToLiquidate - activeRes.monthsToLiquidate
  if (monthsDelta !== 0 && results[fastest.id].monthsToLiquidate > 0) {
    out.push({
      tone: monthsDelta < 0 ? 'good' : 'neutral',
      label: `${fastest.name} ${monthsDelta < 0 ? 'finishes' : 'takes'} ${Math.abs(monthsDelta)} mo ${monthsDelta < 0 ? 'sooner' : 'longer'}`,
      detail: `${results[fastest.id].monthsToLiquidate} months to sell out`,
    })
  }

  // Best avg $/unit (often the slow-and-patient one)
  const bestAvg = others.reduce(
    (best, s) =>
      results[s.id].averagePricePerCoin > results[best.id].averagePricePerCoin ? s : best,
    others[0],
  )
  const avgDelta = results[bestAvg.id].averagePricePerCoin - activeRes.averagePricePerCoin
  if (Math.abs(avgDelta) > 0.5 && bestAvg.id !== bestProceeds.id) {
    out.push({
      tone: avgDelta > 0 ? 'good' : 'neutral',
      label: `${bestAvg.name} averages ${formatUSD(results[bestAvg.id].averagePricePerCoin)}/unit`,
      detail: `${avgDelta > 0 ? '+' : '−'}${formatUSD(Math.abs(avgDelta))} vs ${active.name}`,
    })
  }

  return out.slice(0, 3)
}

function Callout({ tone, label, detail }: CalloutProps) {
  const toneCls =
    tone === 'good'
      ? 'border-emerald-400/40 bg-emerald-400/[0.06]'
      : tone === 'bad'
        ? 'border-rose-400/40 bg-rose-400/[0.06]'
        : 'border-white/15 bg-white/[0.03]'
  return (
    <div className={`rounded-md border px-3 py-2 ${toneCls}`}>
      <p className="text-sm font-semibold text-zinc-100">{label}</p>
      <p className="mt-0.5 text-[11px] text-zinc-400">{detail}</p>
    </div>
  )
}

// ─── KPI strip ────────────────────────────────────────────────────

function KpiStrip({
  result,
  coinName,
  scenarioName,
}: {
  result: ForecastResult
  coinName: string
  scenarioName: string
}) {
  const months = result.monthsToLiquidate
  return (
    <section className="grid gap-3 sm:grid-cols-4">
      <Kpi label="Total proceeds" value={formatUSD(result.totalProceeds)} accent />
      <Kpi label="Avg price / unit" value={formatUSD(result.averagePricePerCoin)} />
      <Kpi label="Months to sell out" value={months === 0 ? '—' : months.toString()} />
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
        Active: <span className="text-zinc-300">{scenarioName}</span> ·{' '}
        {coinName} · {result.totalUnitsSold.toLocaleString()} units sold
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

function impliedMonths(holdings: number, ratePerMonth: number): number {
  if (ratePerMonth <= 0 || holdings <= 0) return 0
  return Math.ceil(holdings / ratePerMonth)
}

// ─── Strategy editor ────────────────────────────────────────────────
// Renders plan-specific controls. Spans two grid columns so it sits
// where the sell-rate slider and "sell over months" used to live.

function StrategyEditor({
  scenario,
  scenarios,
  onChange,
}: {
  scenario: Scenario
  scenarios: Scenario[]
  onChange: React.Dispatch<React.SetStateAction<Scenario[]>>
}) {
  const plan = planOf(scenario)

  function updatePlan(next: Scenario['plan']) {
    onChange((prev) => prev.map((s) => (s.id === scenario.id ? { ...s, plan: next } : s)))
  }

  if (plan.kind === 'bengen') {
    return (
      <Field label={`Bengen withdrawal · ${plan.annualPct}% / year`}>
        <input
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={plan.annualPct}
          aria-label="Bengen annual withdrawal rate (percent per year)"
          aria-valuetext={`${plan.annualPct} percent per year`}
          onChange={(e) =>
            updatePlan({ kind: 'bengen', annualPct: parseFloat(e.target.value) })
          }
          className="w-full accent-cyan-400"
        />
        <p className="text-[11px] text-zinc-500">
          Bill Bengen's SAFEMAX: pull this % of the stack's <em>initial</em> USD
          value each year. Unit count drifts down as spot rises. 4% historically
          gave a ~25-year runway.
        </p>
      </Field>
    )
  }

  if (plan.kind === 'price-tiers') {
    return (
      <div className="sm:col-span-2">
        <Field label="Price-tier ladder">
          <div className="space-y-1.5">
            {plan.tiers.map((tier, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-zinc-500">@</span>
                  <NumberInput
                    value={tier.spotTrigger}
                    step={1}
                    onChange={(v) => {
                      const next = { ...plan, tiers: [...plan.tiers] }
                      next.tiers[idx] = { ...tier, spotTrigger: v }
                      updatePlan(next)
                    }}
                  />
                  <span className="text-[11px] text-zinc-500">/oz</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-zinc-500">sell</span>
                  <NumberInput
                    value={tier.sellPct}
                    step={5}
                    onChange={(v) => {
                      const next = { ...plan, tiers: [...plan.tiers] }
                      next.tiers[idx] = { ...tier, sellPct: v }
                      updatePlan(next)
                    }}
                  />
                  <span className="text-[11px] text-zinc-500">% of stack</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updatePlan({ ...plan, tiers: plan.tiers.filter((_, i) => i !== idx) })
                  }
                  className="rounded-sm px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-white/10 hover:text-rose-300"
                  title="Remove tier"
                  aria-label="Remove tier"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const lastSpot = plan.tiers[plan.tiers.length - 1]?.spotTrigger ?? scenario.todaysSpot
                updatePlan({
                  ...plan,
                  tiers: [...plan.tiers, { spotTrigger: Math.round(lastSpot * 1.25), sellPct: 10 }],
                })
              }}
              className="mt-1 rounded-md border border-dashed border-white/15 px-2 py-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            >
              + Add tier
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">
            Each tier fires the first month spot crosses the trigger. Months where
            no tier triggers produce zero sales — the stack just waits.
          </p>
        </Field>
      </div>
    )
  }

  void scenarios
  return null
}
