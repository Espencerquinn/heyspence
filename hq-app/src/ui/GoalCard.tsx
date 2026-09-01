import { useState } from 'react';
import { completeGoal, setMilestoneDone } from '../data/goals';
import { award } from '../data/xpEvents';
import { useSystem } from '../state/SystemContext';
import { useNotify } from '../state/useNotifications';
import { DOMAIN_COLOR, type Goal, type Milestone } from '../types';
import { XP } from '../system/xp';

/**
 * A goal in the Quest Lines panel: title, target date, a milestone
 * progress bar, and one checkbox per milestone. Checking the LAST
 * milestone also completes the goal and awards both EXP values.
 */
export function GoalCard({ goal, milestones }: { goal: Goal; milestones: Milestone[] }) {
  const { today, reload } = useSystem();
  const notify = useNotify();
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const total = milestones.length;
  const doneCount = milestones.filter((m) => m.done_at).length;
  const pct = total === 0 ? 0 : (doneCount / total) * 100;

  async function onToggle(m: Milestone) {
    setError('');
    setBusyId(m.id);
    try {
      const nowDone = !m.done_at;
      await setMilestoneDone(m.id, nowDone);

      if (nowDone) {
        await award({
          amount: XP.milestone, kind: 'milestone', domain: goal.domain,
          refId: m.id, occurredOn: today,
        });

        const remaining = milestones.filter((x) => x.id !== m.id && !x.done_at).length;
        if (remaining === 0) {
          await completeGoal(goal.id);
          await award({
            amount: XP.goal, kind: 'goal', domain: goal.domain,
            refId: goal.id, occurredOn: today,
          });
          notify({
            kind: 'QUEST COMPLETE',
            huge: goal.title.toUpperCase(),
            lead: 'Every milestone cleared. The System records this quest line as done.',
            deltas: [
              { text: `+${XP.milestone} EXP` },
              { text: `+${XP.goal} EXP` },
            ],
            fine: 'Title acquired. Filed under completed quest lines.',
          });
        }
      }

      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="goal" style={{ ['--k' as string]: DOMAIN_COLOR[goal.domain] }}>
      <div className="goal__head">
        <span className="goal__title">{goal.title}</span>
        {goal.target_date && <span className="goal__date">DUE {goal.target_date}</span>}
      </div>
      <div className="goal__bar"><i style={{ width: `${pct}%` }} /></div>
      <div className="goal__milestones">
        {milestones.map((m) => (
          <button
            key={m.id}
            type="button"
            className="milestone"
            aria-pressed={!!m.done_at}
            disabled={busyId === m.id}
            onClick={() => void onToggle(m)}
          >
            <span className="box" aria-hidden="true" />
            <span className="milestone__title">{m.title}</span>
          </button>
        ))}
      </div>
      {error && <p className="inline-error">{error}</p>}
    </div>
  );
}
