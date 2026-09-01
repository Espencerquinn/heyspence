import { supabase } from '../supabaseClient';
import type { Habit } from '../types';

export async function listHabits(): Promise<Habit[]> {
  const { data, error } = await supabase.from('habits').select('*').order('sort_order');
  if (error) throw error;
  return data as Habit[];
}

export async function createHabit(h: Omit<Habit, 'id'>): Promise<Habit> {
  const { data, error } = await supabase.from('habits').insert(h).select().single();
  if (error) throw error;
  return data as Habit;
}

export async function updateHabit(id: string, patch: Partial<Habit>): Promise<void> {
  const { error } = await supabase.from('habits').update(patch).eq('id', id);
  if (error) throw error;
}

export async function archiveHabit(id: string): Promise<void> {
  await updateHabit(id, { archived_at: new Date().toISOString() });
}
