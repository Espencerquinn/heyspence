import { supabase } from '../supabaseClient';
import type { Note } from '../types';

export async function fetchNotes(leadId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Note[];
}

// author_* come from the signed-in user; RLS still independently enforces access.
export async function addNote(leadId: string, body: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const email = u.user?.email ?? '';
  const { data: au } = await supabase
    .from('allowed_users').select('display_name').eq('email', email).single();
  const { error } = await supabase.from('notes').insert({
    lead_id: leadId, body, author_email: email, author_name: au?.display_name ?? email,
  });
  if (error) throw error;
}
