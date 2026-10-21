// hq-health-ingest — receives Health Auto Export (iOS) REST automations and
// upserts daily metrics and workouts into the hq schema.
//
// Auth: NOT a user JWT (deploy with --no-verify-jwt). The phone sends
//   Authorization: Bearer <HQ_INGEST_TOKEN>
// which must match the function secret of the same name.
//
// Configure the automation with Aggregation = Days so each data point is a
// whole-day total; the upsert then simply overwrites a day with the fuller number.

import { createClient } from 'jsr:@supabase/supabase-js@2';

type Agg = 'sum' | 'avg' | 'last';
interface MetricSpec { metric: string; agg: Agg; unit: string; convert?: (v: number, units: string) => number }

const kj = (v: number, u: string) => (/kj/i.test(u) ? v / 4.184 : v);
const kg = (v: number, u: string) => (/^kg$/i.test(u) ? v * 2.20462 : v);
const km = (v: number, u: string) => (/^km$/i.test(u) ? v * 0.621371 : v);

// Health Auto Export metric name → our metric.
const METRICS: Record<string, MetricSpec> = {
  step_count:              { metric: 'steps',          agg: 'sum',  unit: 'count' },
  active_energy:           { metric: 'active_kcal',    agg: 'sum',  unit: 'kcal', convert: kj },
  basal_energy_burned:     { metric: 'basal_kcal',     agg: 'sum',  unit: 'kcal', convert: kj },
  apple_exercise_time:     { metric: 'exercise_min',   agg: 'sum',  unit: 'min' },
  apple_stand_hour:        { metric: 'stand_hours',    agg: 'sum',  unit: 'hr' },
  walking_running_distance:{ metric: 'distance_mi',    agg: 'sum',  unit: 'mi', convert: km },
  resting_heart_rate:      { metric: 'resting_hr',     agg: 'avg',  unit: 'bpm' },
  heart_rate_variability:  { metric: 'hrv_ms',         agg: 'avg',  unit: 'ms' },
  vo2_max:                 { metric: 'vo2max',         agg: 'last', unit: 'ml/kg/min' },
  weight_body_mass:        { metric: 'weight_lb',      agg: 'last', unit: 'lb', convert: kg },
  body_fat_percentage:     { metric: 'bodyfat_pct',    agg: 'last', unit: '%' },
  dietary_water:           { metric: 'water_floz',     agg: 'sum',  unit: 'fl oz' },
};

interface Point { date?: string; qty?: number; totalSleep?: number; asleep?: number; [k: string]: unknown }
interface HaeMetric { name: string; units?: string; data?: Point[] }
interface Qty { qty?: number; units?: string }
interface HaeWorkout {
  id?: string; name?: string; start?: string; end?: string; duration?: number;
  activeEnergyBurned?: Qty; activeEnergy?: Qty | Array<{ qty?: number }>;
  avgHeartRate?: Qty; maxHeartRate?: Qty;
  heartRate?: { avg?: Qty; max?: Qty };
  heartRateData?: Array<{ Avg?: number; Max?: number; source?: string }>;
  source?: string; sourceName?: string; metadata?: Record<string, unknown>;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** 'yyyy-MM-dd HH:mm:ss Z' or ISO → the phone-local calendar day. */
const dayOf = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);

/** 'yyyy-MM-dd HH:mm:ss -0600' → ISO parseable by Postgres. */
function toTimestamp(s?: string): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/);
  return m ? `${m[1]}T${m[2]}${m[3]}:${m[4]}` : s;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const secret = Deno.env.get('HQ_INGEST_TOKEN') ?? '';
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!secret || !safeEqual(given, secret)) return json({ error: 'unauthorized' }, 401);

  let body: { data?: { metrics?: HaeMetric[]; workouts?: HaeWorkout[] } };
  try { body = await req.json(); } catch { return json({ error: 'invalid JSON' }, 400); }

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { db: { schema: 'hq' }, auth: { persistSession: false } },
  );

  const metrics = body.data?.metrics ?? [];
  const workouts = body.data?.workouts ?? [];
  const unknown: string[] = [];

  // ---- daily metrics ----
  const acc = new Map<string, { metric: string; unit: string; agg: Agg; vals: number[] }>();
  const push = (date: string, metric: string, unit: string, agg: Agg, v: number) => {
    if (!Number.isFinite(v)) return;
    const k = `${date}|${metric}`;
    const cur = acc.get(k) ?? { metric, unit, agg, vals: [] };
    cur.vals.push(v);
    acc.set(k, cur);
  };

  for (const m of metrics) {
    if (m.name === 'sleep_analysis') {
      for (const p of m.data ?? []) {
        const d = dayOf(p.date);
        const hrs = Number(p.totalSleep ?? p.asleep ?? p.qty);
        if (d) push(d, 'sleep_hours', 'hr', 'sum', hrs);
      }
      continue;
    }
    const spec = METRICS[m.name];
    if (!spec) { unknown.push(m.name); continue; }
    for (const p of m.data ?? []) {
      const d = dayOf(p.date);
      if (!d || p.qty === undefined) continue;
      const v = Number(p.qty);
      push(d, spec.metric, spec.unit, spec.agg, spec.convert ? spec.convert(v, m.units ?? '') : v);
    }
  }

  const dailyRows = [...acc.entries()].map(([k, a]) => {
    const value = a.agg === 'sum' ? a.vals.reduce((s, v) => s + v, 0)
      : a.agg === 'avg' ? a.vals.reduce((s, v) => s + v, 0) / a.vals.length
      : a.vals[a.vals.length - 1];
    return {
      metric_date: k.split('|')[0], metric: a.metric, unit: a.unit,
      value: Math.round(value * 100) / 100, updated_at: new Date().toISOString(),
    };
  });

  // ---- workouts ----
  const workoutRows = workouts.flatMap((w) => {
    const started = toTimestamp(w.start);
    const day = dayOf(w.start);
    if (!w.id || !started || !day) return [];
    const energy = Array.isArray(w.activeEnergy)
      ? w.activeEnergy.reduce((s, x) => s + Number(x.qty ?? 0), 0)
      : Number(w.activeEnergyBurned?.qty ?? w.activeEnergy?.qty ?? NaN);
    const energyUnits = (Array.isArray(w.activeEnergy) ? '' : w.activeEnergyBurned?.units ?? w.activeEnergy?.units) ?? '';
    const avgHr = Number(w.avgHeartRate?.qty ?? w.heartRate?.avg?.qty ?? NaN);
    const maxHr = Number(w.maxHeartRate?.qty ?? w.heartRate?.max?.qty ?? NaN);
    const num = (v: number) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
    return [{
      external_id: w.id,
      name: w.name ?? 'Workout',
      source: w.sourceName ?? w.source ?? w.heartRateData?.[0]?.source ?? null,
      started_at: started,
      ended_at: toTimestamp(w.end),
      workout_date: day,
      duration_min: w.duration !== undefined ? num(Number(w.duration) / 60) : null,
      active_kcal: num(kj(energy, energyUnits)),
      avg_hr: num(avgHr),
      max_hr: num(maxHr),
    }];
  });

  const errors: string[] = [];
  if (dailyRows.length) {
    const { error } = await db.from('health_daily').upsert(dailyRows, { onConflict: 'metric_date,metric' });
    if (error) errors.push(`health_daily: ${error.message}`);
  }
  if (workoutRows.length) {
    const { error } = await db.from('workouts').upsert(workoutRows, { onConflict: 'external_id' });
    if (error) errors.push(`workouts: ${error.message}`);
  }

  const summary = {
    metrics: dailyRows.length, workouts: workoutRows.length,
    received: { metrics: metrics.length, workouts: workouts.length },
    unknown_metrics: unknown, errors,
  };
  const raw = JSON.stringify(body);
  await db.from('ingest_log').insert({
    automation: req.headers.get('automation-name'),
    summary,
    sample: raw.length <= 20_000 ? body : { truncated: raw.slice(0, 20_000) },
  });
  // Keep the log small: only the latest 50 deliveries.
  const { data: old } = await db.from('ingest_log').select('id')
    .order('id', { ascending: false }).range(50, 500);
  if (old?.length) await db.from('ingest_log').delete().in('id', old.map((r) => r.id));

  return json({ ok: errors.length === 0, ...summary }, errors.length ? 500 : 200);
});
