import { storageGet } from './storage'

/**
 * How a scenario decides how many units to sell each month. The
 * simulator dispatches on `plan.kind`. `fixed-rate` is the original
 * behavior and consumes `Scenario.unitsPerMonth` directly.
 */
export type SellPlan =
  | { kind: 'fixed-rate' }
  | {
      /** Withdraw a fixed % of the initial USD value of the stack
       *  every year, divided into 12 monthly checks. Unit count drifts
       *  down as spot rises — that's the point of the rule. */
      kind: 'bengen'
      annualPct: number
    }
  | {
      /** Sell a chunk of the original holdings the first month spot
       *  rises above each trigger. Months where no tier triggers
       *  produce zero sales (pure target-price selling). */
      kind: 'price-tiers'
      tiers: { spotTrigger: number; sellPct: number }[]
    }

export interface Scenario {
  id: string
  name: string
  color: string
  coinId: string
  holdingsUnits: number
  /** Used directly by fixed-rate plans, ignored otherwise. */
  unitsPerMonth: number
  todaysSpot: number
  annualGrowthPct: number
  dealerPremiumPerOz: number
  /** Monthly spot overrides the user has manually adjusted. */
  monthlySpotOverrides: number[]
  /** How sell units are decided each month. Optional for backward
   *  compatibility with v1 persisted state. */
  plan?: SellPlan
}

export function planOf(s: Scenario): SellPlan {
  return s.plan ?? { kind: 'fixed-rate' }
}

export function planLabel(p: SellPlan): string {
  switch (p.kind) {
    case 'fixed-rate':
      return 'Fixed rate'
    case 'bengen':
      return `Bengen ${p.annualPct}%`
    case 'price-tiers':
      return `Price tiers · ${p.tiers.length}`
  }
}

/** Palette used when a new scenario is created. Cycles through the list,
 *  skipping any colors already in use. */
export const SCENARIO_COLORS = [
  '#22d3ee', // cyan-400
  '#f472b6', // pink-400
  '#a3e635', // lime-400
  '#fbbf24', // amber-400
  '#a78bfa', // violet-400
  '#fb7185', // rose-400
  '#38bdf8', // sky-400
  '#facc15', // yellow-400
]

export function nextColor(used: string[]): string {
  for (const c of SCENARIO_COLORS) {
    if (!used.includes(c)) return c
  }
  return SCENARIO_COLORS[used.length % SCENARIO_COLORS.length]
}

export function newScenarioId(): string {
  return `s_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36).slice(-4)}`
}

// ─── Preset library ──────────────────────────────────────────────

/** Inputs a preset needs to derive a sensible default scenario. */
export interface PresetSeed {
  coinId: string
  holdingsUnits: number
  todaysSpot: number
  annualGrowthPct: number
  dealerPremiumPerOz: number
}

export interface ScenarioPreset {
  id: string
  name: string
  description: string
  build: (seed: PresetSeed) => Omit<Scenario, 'id' | 'color'>
}

export const PRESETS: ScenarioPreset[] = [
  {
    id: 'dca-12mo',
    name: 'DCA · 12-month sellout',
    description:
      'Boglehead of selling: divide holdings into 12 equal monthly tranches. Spot-agnostic and forces discipline.',
    build: (s) => ({
      name: 'DCA · 12 months',
      coinId: s.coinId,
      holdingsUnits: s.holdingsUnits,
      unitsPerMonth: Math.max(1, Math.ceil(s.holdingsUnits / 12)),
      todaysSpot: s.todaysSpot,
      annualGrowthPct: s.annualGrowthPct,
      dealerPremiumPerOz: s.dealerPremiumPerOz,
      monthlySpotOverrides: [],
      plan: { kind: 'fixed-rate' },
    }),
  },
  {
    id: 'dca-24mo',
    name: 'DCA · 24-month sellout',
    description:
      'Moderate-pace dollar-cost-average exit. Halves single-month timing risk vs. the 12-month plan.',
    build: (s) => ({
      name: 'DCA · 24 months',
      coinId: s.coinId,
      holdingsUnits: s.holdingsUnits,
      unitsPerMonth: Math.max(1, Math.ceil(s.holdingsUnits / 24)),
      todaysSpot: s.todaysSpot,
      annualGrowthPct: s.annualGrowthPct,
      dealerPremiumPerOz: s.dealerPremiumPerOz,
      monthlySpotOverrides: [],
      plan: { kind: 'fixed-rate' },
    }),
  },
  {
    id: 'dca-60mo',
    name: 'DCA · 60-month sellout',
    description:
      'Patient 5-year drawdown. Smooths out the cycle, captures more of a sustained uptrend, but extends exposure.',
    build: (s) => ({
      name: 'DCA · 60 months',
      coinId: s.coinId,
      holdingsUnits: s.holdingsUnits,
      unitsPerMonth: Math.max(1, Math.ceil(s.holdingsUnits / 60)),
      todaysSpot: s.todaysSpot,
      annualGrowthPct: s.annualGrowthPct,
      dealerPremiumPerOz: s.dealerPremiumPerOz,
      monthlySpotOverrides: [],
      plan: { kind: 'fixed-rate' },
    }),
  },
  {
    id: 'bengen-4',
    name: 'Bengen 4% rule',
    description:
      "Bill Bengen's SAFEMAX: pull 4% of the stack's initial USD value every year (≈25-year runway). Unit count drifts down as spot rises.",
    build: (s) => ({
      name: 'Bengen 4%',
      coinId: s.coinId,
      holdingsUnits: s.holdingsUnits,
      // Seed unitsPerMonth as the month-1 implied rate so the slider
      // still shows something sensible if the user flips back to fixed.
      unitsPerMonth: Math.max(1, Math.round((s.holdingsUnits * 0.04) / 12)),
      todaysSpot: s.todaysSpot,
      annualGrowthPct: s.annualGrowthPct,
      dealerPremiumPerOz: s.dealerPremiumPerOz,
      monthlySpotOverrides: [],
      plan: { kind: 'bengen', annualPct: 4 },
    }),
  },
  {
    id: 'price-tiers',
    name: 'Sell-into-strength · price ladder',
    description:
      "Trader's playbook: sell 25% of the stack the first month each price target is hit. Tiers default to 1.25×, 1.5×, 2×, 3× current spot.",
    build: (s) => ({
      name: 'Sell-into-strength',
      coinId: s.coinId,
      holdingsUnits: s.holdingsUnits,
      unitsPerMonth: 0, // Not used; tiers fire on price.
      todaysSpot: s.todaysSpot,
      annualGrowthPct: s.annualGrowthPct,
      dealerPremiumPerOz: s.dealerPremiumPerOz,
      monthlySpotOverrides: [],
      plan: {
        kind: 'price-tiers',
        tiers: [
          { spotTrigger: round(s.todaysSpot * 1.25), sellPct: 25 },
          { spotTrigger: round(s.todaysSpot * 1.5), sellPct: 25 },
          { spotTrigger: round(s.todaysSpot * 2.0), sellPct: 25 },
          { spotTrigger: round(s.todaysSpot * 3.0), sellPct: 25 },
        ],
      },
    }),
  },
]

function round(n: number): number {
  return Math.round(n * 100) / 100
}

interface LegacyState {
  coinId: string
  holdingsUnits: number
  unitsPerMonth: number
  todaysSpot: number
  annualGrowthPct: number
  dealerPremiumPerOz: number
  monthlySpotOverrides: number[]
}

const LEGACY_DEFAULTS: LegacyState = {
  coinId: 'csml-1oz',
  holdingsUnits: 1000,
  unitsPerMonth: 50,
  todaysSpot: 75.0,
  annualGrowthPct: 8,
  dealerPremiumPerOz: 1.25,
  monthlySpotOverrides: [],
}

function readLegacyState(): LegacyState | null {
  const probe = localStorage.getItem('heyspence.units.coinId')
  if (probe == null) return null
  return {
    coinId: storageGet('coinId', LEGACY_DEFAULTS.coinId),
    holdingsUnits: storageGet('holdingsUnits', LEGACY_DEFAULTS.holdingsUnits),
    unitsPerMonth: storageGet('unitsPerMonth', LEGACY_DEFAULTS.unitsPerMonth),
    todaysSpot: storageGet('todaysSpot', LEGACY_DEFAULTS.todaysSpot),
    annualGrowthPct: storageGet('annualGrowthPct', LEGACY_DEFAULTS.annualGrowthPct),
    dealerPremiumPerOz: storageGet('dealerPremiumPerOz', LEGACY_DEFAULTS.dealerPremiumPerOz),
    monthlySpotOverrides: storageGet<number[]>('monthlySpotOverrides', []),
  }
}

export function loadInitialScenarios(): {
  scenarios: Scenario[]
  activeId: string
  visibleIds: string[]
} {
  const saved = storageGet<Scenario[] | null>('scenarios', null)
  const savedActive = storageGet<string | null>('activeScenarioId', null)
  const savedVisible = storageGet<string[] | null>('visibleScenarioIds', null)

  if (saved && saved.length > 0) {
    const activeId =
      savedActive && saved.some((s) => s.id === savedActive) ? savedActive : saved[0].id
    const visibleIds =
      savedVisible && savedVisible.length > 0
        ? savedVisible.filter((id) => saved.some((s) => s.id === id))
        : [activeId]
    return { scenarios: saved, activeId, visibleIds: visibleIds.length > 0 ? visibleIds : [activeId] }
  }

  const legacy = readLegacyState() ?? LEGACY_DEFAULTS
  const id = newScenarioId()
  const scenario: Scenario = {
    id,
    name: "Spencer's plan",
    color: SCENARIO_COLORS[0],
    ...legacy,
    plan: { kind: 'fixed-rate' },
  }
  return { scenarios: [scenario], activeId: id, visibleIds: [id] }
}

export function duplicateScenario(src: Scenario, existing: Scenario[]): Scenario {
  const usedColors = existing.map((s) => s.color)
  return {
    ...src,
    id: newScenarioId(),
    name: uniqueName(src.name, existing),
    color: nextColor(usedColors),
    monthlySpotOverrides: [...src.monthlySpotOverrides],
    // Plan needs a deep copy too — tier arrays are mutable.
    plan: src.plan ? structuredClone(src.plan) : { kind: 'fixed-rate' },
  }
}

export function scenarioFromPreset(preset: ScenarioPreset, seed: PresetSeed, existing: Scenario[]): Scenario {
  const built = preset.build(seed)
  return {
    ...built,
    id: newScenarioId(),
    name: uniqueName(built.name, existing),
    color: nextColor(existing.map((s) => s.color)),
  }
}

function uniqueName(base: string, existing: Scenario[]): string {
  const names = new Set(existing.map((s) => s.name))
  if (!names.has(base)) return base
  let n = 2
  while (names.has(`${base} (${n})`)) n++
  return `${base} (${n})`
}
