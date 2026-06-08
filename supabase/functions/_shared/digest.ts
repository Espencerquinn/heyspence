// digest.ts — pure digest builder.
export interface StatusChange {
  lead_name: string; from_status: string; to_status: string; changed_at: string;
}
export interface NoteRow {
  lead_name: string; author_name: string; body: string; created_at: string;
}
export interface Digest { hasActivity: boolean; subject: string; html: string; }

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function buildDigest(changes: StatusChange[], notes: NoteRow[]): Digest {
  const hasActivity = changes.length > 0 || notes.length > 0;
  if (!hasActivity) {
    return {
      hasActivity: false,
      subject: 'Timp Vista Circle leads — no changes today',
      html: '<h2>No changes today</h2><p>No status changes or new notes in the last 24 hours.</p>',
    };
  }
  const subject = `Timp Vista Circle leads — ${plural(changes.length, 'status change')}, ${plural(notes.length, 'note')}`;
  const changesHtml = changes.length
    ? `<h3>Status changes</h3><ul>${changes.map((c) =>
        `<li><strong>${c.lead_name}</strong>: ${c.from_status} → ${c.to_status}</li>`).join('')}</ul>`
    : '';
  const notesHtml = notes.length
    ? `<h3>New notes</h3><ul>${notes.map((n) =>
        `<li><strong>${n.lead_name}</strong> — ${n.author_name}: ${n.body}</li>`).join('')}</ul>`
    : '';
  return { hasActivity, subject, html: `<h2>Daily lead summary</h2>${changesHtml}${notesHtml}` };
}
