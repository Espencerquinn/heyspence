import { useState } from 'react';
import { addNote } from '../data/notes';

export function AddNote({ applicationId, onAdded }: { applicationId: string; onAdded: () => void }) {
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!body.trim()) return;
    setSaving(true);
    try { await addNote(applicationId, body.trim()); setBody(''); onAdded(); }
    finally { setSaving(false); }
  }
  return (
    <div className="add-note">
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a note…" />
      <button className="btn btn--primary" disabled={saving || !body.trim()} onClick={submit}>
        {saving ? 'Saving…' : 'Add note'}
      </button>
    </div>
  );
}
