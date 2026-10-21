import { supabase } from '../supabaseClient';
import { fetchAllPages } from './fetchAll';
import type { HealthDaily, Workout } from '../types';

/** Synced daily metrics from `sinceISO` forward (Health Auto Export → hq-health-ingest). */
export async function listHealth(sinceISO: string): Promise<HealthDaily[]> {
  return fetchAllPages<HealthDaily>((from, to) =>
    supabase
      .from('health_daily')
      .select('metric_date, metric, value, unit, updated_at')
      .gte('metric_date', sinceISO)
      .order('metric_date')
      .order('metric')
      .range(from, to),
  );
}

export async function listWorkouts(sinceISO: string): Promise<Workout[]> {
  return fetchAllPages<Workout>((from, to) =>
    supabase
      .from('workouts')
      .select('id, name, source, started_at, workout_date, duration_min, active_kcal, avg_hr')
      .gte('workout_date', sinceISO)
      .order('started_at')
      .order('id')
      .range(from, to),
  );
}

/** `${date}:${metric}` → value, the lookup shape the system modules take. */
export function healthIndex(rows: ReadonlyArray<HealthDaily>): Map<string, number> {
  return new Map(rows.map((r) => [`${r.metric_date}:${r.metric}`, Number(r.value)]));
}
