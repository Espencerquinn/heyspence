import { supabase } from '../supabaseClient';
import type { Penalty } from '../types';

export async function listPenalties(): Promise<Penalty[]> {
  const { data, error } = await supabase
    .from('penalties').select('penalty_date, missed_habit_ids, xp_lost, streak_before');
  if (error) throw error;
  return data as Penalty[];
}

/**
 * Inserts a penalty row. Returns true if this call actually inserted the
 * row, false if it already existed (a 23505 conflict — e.g. a concurrent
 * catch-up run, such as React StrictMode's double effect invocation in dev,
 * or two open tabs in production). Callers must gate any follow-on ledger
 * write (awarding the XP loss) on this return value, or a race can insert
 * the penalty row once but double-deduct the EXP.
 */
export async function recordPenalty(p: Penalty): Promise<boolean> {
  const { data, error } = await supabase.from('penalties').insert(p).select();
  if (error) {
    if (error.code === '23505') return false;   // already recorded by a concurrent run
    throw error;
  }
  return (data?.length ?? 0) > 0;
}
