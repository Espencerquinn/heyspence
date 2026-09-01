import { useState } from 'react';
import { archiveHabit } from '../data/habits';
import { useSystem } from '../state/SystemContext';
import { streakFor } from '../system/streaks';
import type { Habit } from '../types';

/**
 * One row in a domain's Habits panel: name, streak, and an Archive control.
 * Archiving is the only remedy for a habit that was created by mistake — a
 * habit that stays active costs a −40 EXP penalty and severs the quest
 * streak every day it goes unmet, so this needs to be reachable without SQL.
 */
export function HabitRow({ habit }: { habit: Habit }) {
  const { index, today, reload } = useSystem();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onArchive() {
    setError('');
    setBusy(true);
    try {
      await archiveHabit(habit.id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="habit-row">
      <span className="habit-row__info">
        <span className="habit-row__name">{habit.name}</span>
        <span className="habit-row__streak">
          {streakFor(habit, index, today)} DAY STREAK
        </span>
      </span>
      <span className="habit-row__actions">
        {confirming ? (
          <>
            <button type="button" className="btn btn--sm" disabled={busy} onClick={() => void onArchive()}>
              {busy ? 'Archiving…' : 'Yes'}
            </button>
            <button type="button" className="ghost" disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="ghost" onClick={() => setConfirming(true)}>
            Archive
          </button>
        )}
      </span>
      {error && <p className="inline-error">{error}</p>}
    </div>
  );
}
