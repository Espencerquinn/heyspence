import { supabase } from '../supabaseClient';
import type { JournalEntry } from '../types';

export async function listEntries(): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('entry_date, body, mood, energy, lesson')
    .order('entry_date', { ascending: false });
  if (error) throw error;
  return data as JournalEntry[];
}

export async function getEntry(date: string): Promise<JournalEntry | null> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('entry_date, body, mood, energy, lesson')
    .eq('entry_date', date)
    .maybeSingle();
  if (error) throw error;
  return data as JournalEntry | null;
}

export async function upsertEntry(entry: JournalEntry): Promise<void> {
  const { error } = await supabase
    .from('journal_entries').upsert(entry, { onConflict: 'entry_date' });
  if (error) throw error;
}
