import { supabase } from '../supabaseClient';
import type { TitleRow } from '../types';

export async function listTitles(): Promise<TitleRow[]> {
  const { data, error } = await supabase.from('titles').select('code, unlocked_at');
  if (error) throw error;
  return data as TitleRow[];
}

export async function unlockTitle(code: string): Promise<void> {
  const { error } = await supabase.from('titles').insert({ code });
  if (error && error.code !== '23505') throw error;
}
