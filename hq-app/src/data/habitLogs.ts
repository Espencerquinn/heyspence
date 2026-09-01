import { supabase } from '../supabaseClient';
import { fetchAllPages } from './fetchAll';
import type { HabitLog } from '../types';

/** Logs from `sinceISO` forward. 400 days back covers the longest streak scan. */
export async function listLogs(sinceISO: string): Promise<HabitLog[]> {
  return fetchAllPages<HabitLog>((from, to) =>
    supabase
      .from('habit_logs')
      .select('habit_id, log_date, count')
      .gte('log_date', sinceISO)
      .order('log_date')
      .range(from, to),
  );
}

export async function setLog(habitId: string, date: string, count: number): Promise<void> {
  if (count <= 0) {
    const { error } = await supabase
      .from('habit_logs').delete().eq('habit_id', habitId).eq('log_date', date);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('habit_logs')
    .upsert({ habit_id: habitId, log_date: date, count }, { onConflict: 'habit_id,log_date' });
  if (error) throw error;
}
