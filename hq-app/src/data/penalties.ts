import { supabase } from '../supabaseClient';
import type { Penalty } from '../types';

export async function listPenalties(): Promise<Penalty[]> {
  const { data, error } = await supabase
    .from('penalties').select('penalty_date, missed_habit_ids, xp_lost, streak_before');
  if (error) throw error;
  return data as Penalty[];
}

export async function recordPenalty(p: Penalty): Promise<void> {
  const { error } = await supabase.from('penalties').insert(p);
  if (error && error.code !== '23505') throw error;
}
