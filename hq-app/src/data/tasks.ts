import { supabase } from '../supabaseClient';
import { fetchAllPages } from './fetchAll';
import type { Task } from '../types';

export async function listTasks(): Promise<Task[]> {
  return fetchAllPages<Task>((from, to) =>
    supabase
      .from('tasks')
      .select('*')
      .eq('status', 'open')
      .order('due_date', { nullsFirst: false })
      .range(from, to),
  );
}

export async function createTask(t: Omit<Task, 'id' | 'completed_at' | 'status'>): Promise<void> {
  const { error } = await supabase.from('tasks').insert({ ...t, status: 'open' });
  if (error) throw error;
}

export async function completeTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function setFocus(id: string, is_focus: boolean): Promise<void> {
  const { error } = await supabase.from('tasks').update({ is_focus }).eq('id', id);
  if (error) throw error;
}
