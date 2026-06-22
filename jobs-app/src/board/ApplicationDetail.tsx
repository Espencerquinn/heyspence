import { useEffect, useState } from 'react';
import { STATUSES, isQueuedForDrafting, type Application, type ApplicationNote, type Status } from '../types';
import { fetchNotes } from '../data/notes';
import {
  fetchApplicationDetail, updateApplicationFields, updateApplicationStatus, deleteApplication,
} from '../data/applications';
import { NotesThread } from './NotesThread';
import { AddNote } from './AddNote';

export function ApplicationDetail({ app, onClose }: { app: Application; onClose: () => void }) {
  const [current, setCurrent] = useState<Application>(app);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<ApplicationNote[]>([]);
  const [saving, setSaving] = useState(false);
  const [jdOpen, setJdOpen] = useState(false);

  // Editable drafts of the agent's output.
  const [resume, setResume] = useState('');
  const [cover, setCover] = useState('');
  const [copied, setCopied] = useState<'resume' | 'cover' | null>(null);

  async function loadNotes() { setNotes(await fetchNotes(app.id)); }

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchApplicationDetail(app.id).then((full) => {
      if (!active) return;
      setCurrent(full);
      setResume(full.tailored_resume ?? '');
      setCover(full.cover_letter ?? '');
      setLoading(false);
    });
    loadNotes();
    return () => { active = false; };
  }, [app.id]);

  async function saveDrafts() {
    setSaving(true);
    try {
      await updateApplicationFields(current.id, { tailored_resume: resume, cover_letter: cover });
      setCurrent({ ...current, tailored_resume: resume, cover_letter: cover });
    } finally { setSaving(false); }
  }

  async function moveTo(status: Status) {
    setSaving(true);
    try { await updateApplicationStatus(current.id, status); setCurrent({ ...current, status }); }
    finally { setSaving(false); }
  }

  async function copy(which: 'resume' | 'cover') {
    await navigator.clipboard.writeText(which === 'resume' ? resume : cover);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  const dirty = resume !== (current.tailored_resume ?? '') || cover !== (current.cover_letter ?? '');
  const queued = isQueuedForDrafting(current);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <button className="drawer__close" onClick={onClose}>×</button>
        <h2>{current.role_title}</h2>

        <dl className="lead-fields">
          <dt>Company</dt><dd>{current.company}</dd>
          <dt>Location</dt><dd>{current.location || '—'}</dd>
          <dt>Team</dt><dd>{current.team || '—'}</dd>
          <dt>Salary</dt><dd>{current.salary_range || '—'}</dd>
          <dt>Fit</dt><dd>{typeof current.fit_score === 'number' ? `${current.fit_score}/100` : '—'}</dd>
          <dt>Posting</dt>
          <dd>{current.job_url
            ? <a href={current.job_url} target="_blank" rel="noreferrer">Open job posting →</a>
            : '—'}</dd>
        </dl>

        <label className="status-row">Stage
          <select value={current.status} disabled={saving}
                  onChange={(e) => moveTo(e.target.value as Status)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {current.status !== 'Applied' && (
            <button className="btn btn--ghost" disabled={saving} onClick={() => moveTo('Applied')}>
              Mark applied
            </button>
          )}
        </label>

        {loading ? <p className="notes-empty">Loading…</p> : (
          <>
            {current.fit_summary && (
              <div className="fit-box">
                <h3>Why it fits</h3>
                <p>{current.fit_summary}</p>
              </div>
            )}

            {queued && (
              <p className="queued-banner">
                Queued for drafting — the agent will tailor a resume &amp; cover letter on its next run.
              </p>
            )}

            <div className="draft-block">
              <div className="draft-block__head">
                <h3>Tailored résumé</h3>
                <button className="btn btn--ghost btn--sm" disabled={!resume} onClick={() => copy('resume')}>
                  {copied === 'resume' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <textarea className="draft" value={resume} placeholder="No draft yet."
                        onChange={(e) => setResume(e.target.value)} />
            </div>

            <div className="draft-block">
              <div className="draft-block__head">
                <h3>Cover letter</h3>
                <button className="btn btn--ghost btn--sm" disabled={!cover} onClick={() => copy('cover')}>
                  {copied === 'cover' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <textarea className="draft" value={cover} placeholder="No draft yet."
                        onChange={(e) => setCover(e.target.value)} />
            </div>

            <button className="btn btn--primary" disabled={saving || !dirty} onClick={saveDrafts}>
              {saving ? 'Saving…' : dirty ? 'Save edits' : 'Saved'}
            </button>

            {current.job_description && (
              <div className="jd-box">
                <button className="jd-toggle" onClick={() => setJdOpen((o) => !o)}>
                  {jdOpen ? '▾' : '▸'} Job description
                </button>
                {jdOpen && <pre className="jd-text">{current.job_description}</pre>}
              </div>
            )}
          </>
        )}

        <h3>Notes &amp; updates</h3>
        <AddNote applicationId={current.id} onAdded={loadNotes} />
        <NotesThread notes={notes} />

        <div className="drawer__danger">
          <button className="btn btn--danger" disabled={saving}
            onClick={async () => {
              if (!confirm(`Remove "${current.role_title}"? This deletes the application and its notes.`)) return;
              setSaving(true);
              try { await deleteApplication(current.id); onClose(); }
              finally { setSaving(false); }
            }}>
            Delete application
          </button>
        </div>
      </aside>
    </div>
  );
}
