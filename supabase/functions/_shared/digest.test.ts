// digest.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildDigest, type StatusChange, type NoteRow } from './digest.ts';

Deno.test('empty activity yields a no-changes digest', () => {
  const d = buildDigest([], []);
  assertEquals(d.hasActivity, false);
  assertEquals(d.subject, 'Timp Vista Circle leads — no changes today');
});

Deno.test('summarizes status changes and notes', () => {
  const changes: StatusChange[] = [
    { lead_name: 'Jane', from_status: 'New', to_status: 'Contacted', changed_at: '2026-06-08T15:00:00Z' },
  ];
  const notes: NoteRow[] = [
    { lead_name: 'Jane', author_name: 'Carissa', body: 'Left voicemail', created_at: '2026-06-08T16:00:00Z' },
  ];
  const d = buildDigest(changes, notes);
  assertEquals(d.hasActivity, true);
  assertEquals(d.subject, 'Timp Vista Circle leads — 1 status change, 1 note');
  assertEquals(d.html.includes('Jane') && d.html.includes('New → Contacted'), true);
  assertEquals(d.html.includes('Left voicemail'), true);
});

Deno.test('pluralization is correct', () => {
  const changes: StatusChange[] = [
    { lead_name: 'A', from_status: 'New', to_status: 'Offer', changed_at: 'x' },
    { lead_name: 'B', from_status: 'New', to_status: 'Lost', changed_at: 'x' },
  ];
  const d = buildDigest(changes, []);
  assertEquals(d.subject, 'Timp Vista Circle leads — 2 status changes, 0 notes');
});
