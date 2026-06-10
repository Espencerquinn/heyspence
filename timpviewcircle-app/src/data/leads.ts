import { supabase } from '../supabaseClient';
import type { Lead, Status } from '../types';

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return data as Lead[];
}

export async function updateLeadStatus(id: string, status: Status): Promise<void> {
  const { error } = await supabase.from('leads').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function updateLeadFields(
  id: string, fields: Partial<Pick<Lead, 'name' | 'email' | 'phone' | 'interest'>>,
): Promise<void> {
  const { error } = await supabase.from('leads').update(fields).eq('id', id);
  if (error) throw error;
}

// Deletes the lead and (via cascade) its notes and status history.
export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
}
