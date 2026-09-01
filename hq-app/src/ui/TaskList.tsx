import { useState } from 'react';
import { completeTask, setFocus } from '../data/tasks';
import { award } from '../data/xpEvents';
import { useSystem } from '../state/SystemContext';
import { DOMAIN_COLOR, type Domain, type Task } from '../types';
import { XP } from '../system/xp';

const MAX_FOCUS = 3;

/** Backlog panel: open tasks with a focus star and a complete button. */
export function TaskList({ domain, tasks }: { domain: Domain; tasks: Task[] }) {
  const { snapshot, today, reload } = useSystem();
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

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

  if (tasks.length === 0) {
    return <p className="quest__empty">Nothing in the backlog.</p>;
  }

  return (
    <div className="tasklist" style={{ ['--k' as string]: DOMAIN_COLOR[domain] }}>
      {tasks.map((t) => {
        const disableStar = focusCount >= MAX_FOCUS && !t.is_focus;
        return (
          <div className="task" key={t.id}>
            <button
              type="button"
              className="task__star"
              aria-pressed={t.is_focus}
              aria-label={t.is_focus ? 'Unfocus task' : 'Focus task'}
              disabled={busyId === t.id || disableStar}
              onClick={() => void onToggleFocus(t)}
            >
              ★
            </button>
            <span className="task__body">
              <span className="task__title">{t.title}</span>
              {t.due_date && <span className="task__due">DUE {t.due_date}</span>}
            </span>
            <button
              type="button"
              className="task__complete"
              disabled={busyId === t.id}
              onClick={() => void onComplete(t)}
            >
              Done
            </button>
          </div>
        );
      })}
      {error && <p className="inline-error">{error}</p>}
    </div>
  );
}
