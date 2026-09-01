import { useState } from 'react';
import { Frame } from './Frame';
import { useSystem } from '../state/SystemContext';
import { upsertEntry } from '../data/journal';
import { award } from '../data/xpEvents';
import { XP } from '../system/xp';

export function JournalCapture() {
  const { snapshot, today, reload } = useSystem();
  const existing = snapshot.journal.find((e) => e.entry_date === today);
  const [body, setBody] = useState(existing?.body ?? '');
  const [mood, setMood] = useState<number>(existing?.mood ?? 3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!body.trim()) return;
    setError('');
    setSaving(true);
    try {
      // Decide "is this the first save for today" from the snapshot BEFORE the
      // write, not from a flag captured at mount — a prior save this session
      // already flipped `existing`. The ledger's own (kind, occurred_on)
      // uniqueness is the true backstop against a double award, but only once
      // migration 0005 has been applied — see hq-backend/supabase/migrations/0005.
      const isNew = !existing;
      await upsertEntry({ entry_date: today, body: body.trim(), mood, energy: null, lesson: null });
      if (isNew) await award({ amount: XP.journal, kind: 'journal', occurredOn: today });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Frame title="Log" meta={existing ? 'RECORDED' : `+${XP.journal} EXP`}>
      <div className="journal">
        <label className="journal__label" htmlFor="j-body">
          What happened today, and what did it teach you?
        </label>
        <textarea id="j-body" className="journal__input" rows={4}
                  value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="journal__foot">
          <div className="journal__mood" role="group" aria-label="Mood">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button"
                      className={`mood ${mood === n ? 'mood--on' : ''}`}
                      aria-pressed={mood === n} onClick={() => setMood(n)}>{n}</button>
            ))}
          </div>
          <button className="btn" disabled={saving || !body.trim()} onClick={() => void save()}>
            {saving ? 'Recording…' : existing ? 'Update' : 'Record'}
          </button>
        </div>
        {error && <p className="inline-error">{error}</p>}
      </div>
    </Frame>
  );
}
