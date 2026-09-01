import { supabase } from '../supabaseClient';
import { fetchAllPages } from './fetchAll';
import type { Domain, XpEvent, XpKind } from '../types';

export async function listEvents(): Promise<XpEvent[]> {
  return fetchAllPages<XpEvent>((from, to) =>
    supabase
      .from('xp_events')
      .select('id, domain, amount, kind, ref_id, occurred_on')
      .order('occurred_on')
      .order('id')
      .range(from, to),
  );
}

export interface AwardInput {
  amount: number;
  kind: XpKind;
  domain?: Domain | null;
  refId?: string | null;
  occurredOn: string;
}

/**
 * Append to the ledger. For habit ticks the DB has a unique index on
 * (ref_id, occurred_on) where kind='habit', so a double-tick cannot
 * double-award; a 23505 conflict is expected and swallowed.
 */
export async function award(input: AwardInput): Promise<void> {
  const { error } = await supabase.from('xp_events').insert({
    amount: input.amount,
    kind: input.kind,
    domain: input.domain ?? null,
    ref_id: input.refId ?? null,
    occurred_on: input.occurredOn,
  });
  if (error && error.code !== '23505') throw error;
}

export async function revokeHabitAward(habitId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from('xp_events').delete()
    .eq('kind', 'habit').eq('ref_id', habitId).eq('occurred_on', date);
  if (error) throw error;
}
