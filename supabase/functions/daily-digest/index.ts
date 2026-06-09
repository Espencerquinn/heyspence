import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildDigest, type StatusChange, type NoteRow } from '../_shared/digest.ts';
import { notifyTeam, openBoardButton } from '../_shared/notify.ts';

function denverHour(now: Date): number {
  return Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver', hour: 'numeric', hour12: false,
  }).format(now));
}

Deno.serve(async (req) => {
  // Guard: only proceed at 7 AM Denver. Allow ?force=1 for manual test runs.
  const force = new URL(req.url).searchParams.get('force') === '1';
  if (!force && denverHour(new Date()) !== 7) {
    return new Response(JSON.stringify({ skipped: true, reason: 'not 7am MT' }), { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: sh } = await supabase
    .from('status_history')
    .select('from_status,to_status,changed_at,leads(name)')
    .gte('changed_at', since)
    .order('changed_at', { ascending: true });

  const { data: nt } = await supabase
    .from('notes')
    .select('body,author_name,created_at,leads(name)')
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  const changes: StatusChange[] = (sh ?? []).map((r: any) => ({
    lead_name: r.leads?.name ?? '(deleted)', from_status: r.from_status ?? '—',
    to_status: r.to_status, changed_at: r.changed_at,
  }));
  const notes: NoteRow[] = (nt ?? []).map((r: any) => ({
    lead_name: r.leads?.name ?? '(deleted)', author_name: r.author_name,
    body: r.body, created_at: r.created_at,
  }));

  const digest = buildDigest(changes, notes);
  await notifyTeam(digest.subject, (_n, url) => digest.html + openBoardButton(url));
  return new Response(JSON.stringify({ sent: true, subject: digest.subject }), { status: 200 });
});
