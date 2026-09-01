import { useState, type FormEvent } from 'react';
import { completeGoal, createMilestone, setMilestoneDone } from '../data/goals';
import { award } from '../data/xpEvents';
import { useSystem } from '../state/SystemContext';
import { useNotify } from '../state/useNotifications';
import { DOMAIN_COLOR, type Goal, type Milestone } from '../types';
import { XP } from '../system/xp';

/**
 * A goal in the Quest Lines panel: title, target date, a milestone
 * progress bar, one-way-completable milestones, and a small "add
 * milestone" form. Completing the LAST milestone also completes the
 * goal and awards both EXP values.
 *
 * Milestone completion is intentionally one-way: once `done_at` is set
 * the row renders as a static, non-interactive line. The ledger has no
 * unique index guarding kind='milestone', so a bidirectional toggle
 * would let repeated check/uncheck clicks mint EXP indefinitely.
 */
export function GoalCard({ goal, milestones }: { goal: Goal; milestones: Milestone[] }) {
  const { today, reload } = useSystem();
  const notify = useNotify();
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [addBusy, setAddBusy] = useState(false);

  const total = milestones.length;
  const doneCount = milestones.filter((m) => m.done_at).length;
  const pct = total === 0 ? 0 : (doneCount / total) * 100;

  async function onComplete(m: Milestone) {
    setError('');
    setBusyId(m.id);
    try {
      await setMilestoneDone(m.id, true);
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
          deltas: [{ text: `+${XP.milestone} EXP` }, { text: `+${XP.goal} EXP` }],
          fine: 'Title acquired. Filed under completed quest lines.',
        });
      }

      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function onAddMilestone(e: FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setError('');
    setAddBusy(true);
    try {
      await createMilestone({ goal_id: goal.id, title, sort_order: milestones.length * 10 });
      setNewTitle('');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAddBusy(false);
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
        {milestones.map((m) => m.done_at ? (
          <div className="milestone milestone--done" key={m.id}>
            <span className="box" aria-hidden="true" />
            <span className="milestone__title">{m.title}</span>
          </div>
        ) : (
          <button key={m.id} type="button" className="milestone"
                  disabled={busyId === m.id} onClick={() => void onComplete(m)}>
            <span className="box" aria-hidden="true" />
            <span className="milestone__title">{m.title}</span>
          </button>
        ))}
      </div>
      <form className="mini-form" onSubmit={(e) => void onAddMilestone(e)}>
        <input className="field" type="text" placeholder="New milestone" value={newTitle}
               onChange={(e) => setNewTitle(e.target.value)} aria-label="Milestone title" />
        <button className="btn btn--sm" type="submit" disabled={addBusy || !newTitle.trim()}>
          Add
        </button>
      </form>
      {error && <p className="inline-error">{error}</p>}
    </div>
  );
}
