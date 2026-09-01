import { useState, type FormEvent } from 'react';
import { createGoal } from '../data/goals';
import { useSystem } from '../state/SystemContext';
import type { Domain } from '../types';

/**
 * "Add goal" form for the Quest Lines panel — a domain-scoped sibling to
 * `HabitEditor`, not per-goal (that's `GoalCard`'s "add milestone" form).
 */
export function GoalForm({ domain }: { domain: Domain }) {
  const { reload } = useSystem();
  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setError('');
    setBusy(true);
    try {
      await createGoal({
        domain, title: trimmed, detail: null,
        target_date: targetDate || null, status: 'active',
      });
      setTitle('');
      setTargetDate('');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mini-form-wrap">
      <form className="mini-form" onSubmit={(e) => void onSubmit(e)}>
        <input
          className="field"
          type="text"
          placeholder="New goal"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Goal title"
        />
        <input
          className="field field--date"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          aria-label="Target date (optional)"
        />
        <button className="btn btn--sm" type="submit" disabled={busy || !title.trim()}>
          Add goal
        </button>
      </form>
      {error && <p className="inline-error">{error}</p>}
    </div>
  );
}
