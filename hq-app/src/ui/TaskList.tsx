import { useState, type FormEvent } from 'react';
import { completeTask, createTask, setFocus } from '../data/tasks';
import { award } from '../data/xpEvents';
import { useSystem } from '../state/SystemContext';
import { DOMAIN_COLOR, type Domain, type Task } from '../types';
import { XP } from '../system/xp';

const MAX_FOCUS = 3;

/** Backlog panel: open tasks with a focus star, a complete button, and an add-task form. */
export function TaskList({ domain, tasks }: { domain: Domain; tasks: Task[] }) {
  const { snapshot, today, reload } = useSystem();
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState('');
  const [addBusy, setAddBusy] = useState(false);

  // Focus is a whole-player cap, not a per-domain one, so it is counted
  // across every open task in the snapshot — not just this domain's `tasks`.
  const focusCount = snapshot.tasks.filter((t) => t.is_focus).length;

  async function onToggleFocus(t: Task) {
    setError('');
    setBusyId(t.id);
    try {
      await setFocus(t.id, !t.is_focus);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function onComplete(t: Task) {
    setError('');
    setBusyId(t.id);
    try {
      await completeTask(t.id);
      await award({
        amount: t.is_focus ? XP.focusTask : XP.task,
        kind: 'task', domain: t.domain, refId: t.id, occurredOn: today,
      });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function onAddTask(e: FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setError('');
    setAddBusy(true);
    try {
      await createTask({
        domain, goal_id: null, title, notes: null,
        due_date: newDue || null, is_focus: false,
      });
      setNewTitle('');
      setNewDue('');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAddBusy(false);
    }
  }

  return (
    <div className="tasklist" style={{ ['--k' as string]: DOMAIN_COLOR[domain] }}>
      {tasks.length === 0
        ? <p className="quest__empty">Nothing in the backlog.</p>
        : tasks.map((t) => (
          <div className="task" key={t.id}>
            <button type="button" className="task__star" aria-pressed={t.is_focus}
                    aria-label={t.is_focus ? 'Unfocus task' : 'Focus task'}
                    disabled={busyId === t.id || (focusCount >= MAX_FOCUS && !t.is_focus)}
                    onClick={() => void onToggleFocus(t)}>
              ★
            </button>
            <span className="task__body">
              <span className="task__title">{t.title}</span>
              {t.due_date && <span className="task__due">DUE {t.due_date}</span>}
            </span>
            <button type="button" className="task__complete" disabled={busyId === t.id}
                    onClick={() => void onComplete(t)}>
              Done
            </button>
          </div>
        ))}

      <form className="mini-form" onSubmit={(e) => void onAddTask(e)}>
        <input className="field" type="text" placeholder="New task" value={newTitle}
               onChange={(e) => setNewTitle(e.target.value)} aria-label="Task title" />
        <input className="field field--date" type="date" value={newDue}
               onChange={(e) => setNewDue(e.target.value)} aria-label="Due date (optional)" />
        <button className="btn btn--sm" type="submit" disabled={addBusy || !newTitle.trim()}>
          Add
        </button>
      </form>
      {error && <p className="inline-error">{error}</p>}
    </div>
  );
}
