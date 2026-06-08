import type { Note } from '../types';

export function NotesThread({ notes }: { notes: Note[] }) {
  if (notes.length === 0) return <p className="notes-empty">No notes yet.</p>;
  return (
    <ul className="notes">
      {notes.map((n) => (
        <li key={n.id} className="note">
          <div className="note__head">
            <strong>{n.author_name}</strong>
            <span>{new Date(n.created_at).toLocaleString('en-US', { timeZone: 'America/Denver' })}</span>
          </div>
          <div className="note__body">{n.body}</div>
        </li>
      ))}
    </ul>
  );
}
