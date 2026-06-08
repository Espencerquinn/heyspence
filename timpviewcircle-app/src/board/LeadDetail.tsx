import { useEffect, useState } from 'react';
import type { Lead, Note } from '../types';
import { fetchNotes } from '../data/notes';
import { NotesThread } from './NotesThread';
import { AddNote } from './AddNote';

export function LeadDetail({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  async function loadNotes() { setNotes(await fetchNotes(lead.id)); }
  useEffect(() => { loadNotes(); }, [lead.id]);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <button className="drawer__close" onClick={onClose}>×</button>
        <h2>{lead.name}</h2>
        <dl className="lead-fields">
          <dt>Email</dt><dd>{lead.email}</dd>
          <dt>Phone</dt><dd>{lead.phone}</dd>
          <dt>Interest</dt><dd>{lead.interest}</dd>
          <dt>Status</dt><dd>{lead.status}</dd>
        </dl>
        <h3>Notes</h3>
        <AddNote leadId={lead.id} onAdded={loadNotes} />
        <NotesThread notes={notes} />
      </aside>
    </div>
  );
}
