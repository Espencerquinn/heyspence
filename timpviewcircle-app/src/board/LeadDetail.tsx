import { useEffect, useState } from 'react';
import { STATUSES, type Lead, type Note, type Status } from '../types';
import { fetchNotes } from '../data/notes';
import { updateLeadFields, updateLeadStatus } from '../data/leads';
import { NotesThread } from './NotesThread';
import { AddNote } from './AddNote';

export function LeadDetail({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [current, setCurrent] = useState<Lead>(lead);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: lead.name, email: lead.email, phone: lead.phone,
    interest: lead.interest, status: lead.status,
  });

  async function loadNotes() { setNotes(await fetchNotes(lead.id)); }
  useEffect(() => {
    setCurrent(lead);
    setForm({ name: lead.name, email: lead.email, phone: lead.phone, interest: lead.interest, status: lead.status });
    loadNotes();
  }, [lead.id]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      await updateLeadFields(current.id, {
        name: form.name, email: form.email, phone: form.phone, interest: form.interest,
      });
      if (form.status !== current.status) await updateLeadStatus(current.id, form.status as Status);
      setCurrent({ ...current, ...form, status: form.status as Status });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <button className="drawer__close" onClick={onClose}>×</button>
        <h2>{current.kind === 'offer' ? '🔴 ' : ''}{current.name}</h2>

        {!editing ? (
          <>
            <dl className="lead-fields">
              <dt>Email</dt><dd>{current.email || '—'}</dd>
              <dt>Phone</dt><dd>{current.phone || '—'}</dd>
              <dt>Interest</dt><dd>{current.interest}</dd>
              <dt>Status</dt><dd>{current.status}</dd>
            </dl>
            <button className="btn btn--ghost" onClick={() => setEditing(true)}>Edit details</button>
          </>
        ) : (
          <div className="edit-fields">
            <label>Name<input value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
            <label>Email<input value={form.email} onChange={(e) => set('email', e.target.value)} /></label>
            <label>Phone<input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></label>
            <label>Interest<input value={form.interest} onChange={(e) => set('interest', e.target.value)} /></label>
            <label>Status
              <select value={form.status} onChange={(e) => set('status', e.target.value as Status)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <div className="edit-actions">
              <button className="btn btn--primary" disabled={saving} onClick={save}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn btn--ghost" disabled={saving}
                onClick={() => { setEditing(false); setForm({ name: current.name, email: current.email, phone: current.phone, interest: current.interest, status: current.status }); }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {current.kind === 'offer' && current.offer_details && (
          <div className="offer-box">
            <h3>Offer</h3>
            <dl className="lead-fields">
              <dt>Amount</dt><dd>{current.offer_details.amount || '—'}</dd>
              <dt>Earnest</dt><dd>{current.offer_details.earnest || '—'}</dd>
              <dt>Financing</dt><dd>{current.offer_details.financing || '—'}</dd>
              <dt>Desired closing</dt><dd>{current.offer_details.desired_closing || '—'}</dd>
            </dl>
            {current.offer_details.message && <p className="offer-msg">"{current.offer_details.message}"</p>}
            {current.offer_details.attachment_url && (
              <p><a href={current.offer_details.attachment_url} target="_blank" rel="noreferrer">View attachment →</a></p>
            )}
          </div>
        )}

        <h3>Notes &amp; updates</h3>
        <AddNote leadId={current.id} onAdded={loadNotes} />
        <NotesThread notes={notes} />
      </aside>
    </div>
  );
}
