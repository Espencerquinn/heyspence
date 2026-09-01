import { supabase } from '../supabaseClient';
import { fetchAllPages } from './fetchAll';
import type { Goal, Milestone } from '../types';

export async function listGoals(): Promise<Goal[]> {
  return fetchAllPages<Goal>((from, to) =>
    supabase.from('goals').select('*').order('target_date').order('id').range(from, to),
  );
}

export async function listMilestones(): Promise<Milestone[]> {
  return fetchAllPages<Milestone>((from, to) =>
    supabase.from('milestones').select('*').order('sort_order').order('id').range(from, to),
  );
}

export async function createGoal(g: Omit<Goal, 'id' | 'completed_at'>): Promise<Goal> {
  const { data, error } = await supabase.from('goals').insert(g).select().single();
  if (error) throw error;
  return data as Goal;
}

export async function createMilestone(m: Omit<Milestone, 'id' | 'done_at'>): Promise<void> {
  const { error } = await supabase.from('milestones').insert(m);
  if (error) throw error;
}

export async function setMilestoneDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase
    .from('milestones').update({ done_at: done ? new Date().toISOString() : null }).eq('id', id);
  if (error) throw error;
}

export async function completeGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals')
    .update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
