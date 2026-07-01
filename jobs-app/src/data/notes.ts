import { supabase } from '../supabaseClient';
import { DEMO, DEMO_NOTES } from '../demo';
import type { ApplicationNote } from '../types';

export async function fetchNotes(applicationId: string): Promise<ApplicationNote[]> {
  if (DEMO) return (DEMO_NOTES[applicationId] ?? []).map((n) => ({ ...n }));
  const { data, error } = await supabase
    .from('application_notes').select('*')
    .eq('application_id', applicationId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as ApplicationNote[];
}

// author_* come from the signed-in user (single owner); RLS still enforces access.
export async function addNote(applicationId: string, body: string): Promise<void> {
  if (DEMO) {
    const list = DEMO_NOTES[applicationId] ?? (DEMO_NOTES[applicationId] = []);
    list.unshift({
      id: `n-${Date.now()}`, application_id: applicationId,
      author_email: 'espencer.quinn@gmail.com', author_name: 'Spencer',
      body, created_at: new Date().toISOString(),
    });
    return;
  }
  const { data: u } = await supabase.auth.getUser();
  const email = u.user?.email ?? '';
  const name = (u.user?.user_metadata?.full_name as string | undefined)
    ?? (u.user?.user_metadata?.name as string | undefined)
    ?? email;
  const { error } = await supabase.from('application_notes').insert({
    application_id: applicationId, body, author_email: email, author_name: name,
  });
  if (error) throw error;
}
