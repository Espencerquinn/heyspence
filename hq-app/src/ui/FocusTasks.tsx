import { useState } from 'react';
import { Frame } from './Frame';
import { useSystem } from '../state/SystemContext';
import { completeTask } from '../data/tasks';
import { award } from '../data/xpEvents';
import { DOMAIN_COLOR, STAT_OF, type Task } from '../types';
import { XP } from '../system/xp';

const MAX_FOCUS = 3;

/** STATUS panel: up to three starred tasks, one tap from done. */
export function FocusTasks() {
  const { snapshot, today, reload } = useSystem();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const focused = snapshot.tasks.filter((t) => t.is_focus).slice(0, MAX_FOCUS);

  async function onComplete(t: Task) {
    setError('');
    setBusyId(t.id);
    try {
      await completeTask(t.id);
      await award({
        amount: XP.focusTask, kind: 'task', domain: t.domain, refId: t.id, occurredOn: today,
      });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Frame title="Top 3" meta={`${focused.length} / ${MAX_FOCUS} FOCUSED`}>
      {focused.length === 0 ? (
        <p className="quest__empty">Pick focus tasks from a domain page.</p>
      ) : (
        focused.map((t) => (
          <div className="task" key={t.id} style={{ ['--k' as string]: DOMAIN_COLOR[t.domain] }}>
            <span className="chip">{STAT_OF[t.domain]}</span>
            <span className="task__body">
              <span className="task__title">{t.title}</span>
            </span>
            <button type="button" className="task__complete" disabled={busyId === t.id}
                    onClick={() => void onComplete(t)}>
              Done
            </button>
          </div>
        ))
      )}
      {focused.length > 0 && focused.length < MAX_FOCUS && (
        <p className="quest__empty">Pick focus tasks from a domain page.</p>
      )}
      {error && <p className="inline-error">{error}</p>}
    </Frame>
  );
}
