import { supabase } from '../supabaseClient';
import type { FoodEntry, FoodSource, MacroTargets, Meal } from '../types';

export async function listFood(fromISO: string, toISO: string): Promise<FoodEntry[]> {
  const { data, error } = await supabase
    .from('food_entries').select('*')
    .gte('eaten_on', fromISO).lte('eaten_on', toISO)
    .order('eaten_on').order('created_at');
  if (error) throw error;
  return data as FoodEntry[];
}

export type NewFood = Omit<FoodEntry, 'id' | 'created_at'>;

export async function addFood(entry: NewFood): Promise<void> {
  const { error } = await supabase.from('food_entries').insert(entry);
  if (error) throw error;
}

export async function updateFood(id: string, patch: Partial<NewFood>): Promise<void> {
  const { error } = await supabase.from('food_entries').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteFood(id: string): Promise<void> {
  const { error } = await supabase.from('food_entries').delete().eq('id', id);
  if (error) throw error;
}

/** Distinct recent foods, newest first — the one-tap "eat it again" list. */
export async function recentFoods(limit = 24): Promise<FoodEntry[]> {
  const { data, error } = await supabase
    .from('food_entries').select('*')
    .order('created_at', { ascending: false }).limit(300);
  if (error) throw error;
  const seen = new Set<string>();
  const out: FoodEntry[] = [];
  for (const e of data as FoodEntry[]) {
    const k = e.name.trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

export async function getTargets(): Promise<MacroTargets> {
  const { data, error } = await supabase
    .from('macro_targets').select('kcal, protein_g, carbs_g, fat_g, fiber_g').eq('id', true).single();
  if (error) throw error;
  return data as MacroTargets;
}

export async function setTargets(t: MacroTargets): Promise<void> {
  const { error } = await supabase
    .from('macro_targets').upsert({ id: true, ...t, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/* ---------- lookups via the hq-food Edge Function ---------- */

export interface Candidate {
  name: string;
  serving_label: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  source: FoodSource;
  source_ref: string | null;
}

async function callFood(query: string, init?: { describe: string }): Promise<Candidate[]> {
  const { data, error } = await supabase.functions.invoke(`hq-food${query}`, init
    ? { method: 'POST', body: init }
    : { method: 'GET' });
  if (error) {
    // FunctionsHttpError carries the function's own JSON error in `context`.
    const ctx = (error as { context?: Response }).context;
    const msg = ctx ? (await ctx.json().catch(() => null))?.error : null;
    throw new Error(msg ?? error.message);
  }
  return (data as { candidates: Candidate[] }).candidates;
}

export const lookupBarcode = (code: string) => callFood(`?barcode=${encodeURIComponent(code)}`);
export const searchFoods = (q: string) => callFood(`?q=${encodeURIComponent(q)}`);
export const estimateMeal = (describe: string) => callFood('', { describe });

export function candidateToEntry(c: Candidate, eatenOn: string, meal: Meal, servings = 1): NewFood {
  return {
    eaten_on: eatenOn, meal, servings, name: c.name, serving_label: c.serving_label,
    kcal: c.kcal, protein_g: c.protein_g, carbs_g: c.carbs_g, fat_g: c.fat_g,
    fiber_g: c.fiber_g, source: c.source, source_ref: c.source_ref,
  };
}
