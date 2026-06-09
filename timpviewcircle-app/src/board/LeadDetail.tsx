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
        <h2>{lead.kind === 'offer' ? '🔴 ' : ''}{lead.name}</h2>
        <dl className="lead-fields">
          <dt>Email</dt><dd>{lead.email}</dd>
          <dt>Phone</dt><dd>{lead.phone}</dd>
          <dt>Interest</dt><dd>{lead.interest}</dd>
          <dt>Status</dt><dd>{lead.status}</dd>
        </dl>
        {lead.kind === 'offer' && lead.offer_details && (
          <div className="offer-box">
            <h3>Offer</h3>
            <dl className="lead-fields">
              <dt>Amount</dt><dd>{lead.offer_details.amount || '—'}</dd>
              <dt>Earnest</dt><dd>{lead.offer_details.earnest || '—'}</dd>
              <dt>Financing</dt><dd>{lead.offer_details.financing || '—'}</dd>
              <dt>Desired closing</dt><dd>{lead.offer_details.desired_closing || '—'}</dd>
            </dl>
            {lead.offer_details.message && <p className="offer-msg">"{lead.offer_details.message}"</p>}
            {lead.offer_details.attachment_url && (
              <p><a href={lead.offer_details.attachment_url} target="_blank" rel="noreferrer">View attachment →</a></p>
            )}
          </div>
        )}
        <h3>Notes</h3>
        <AddNote leadId={lead.id} onAdded={loadNotes} />
        <NotesThread notes={notes} />
      </aside>
    </div>
  );
}
