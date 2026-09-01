import { useState } from 'react';
import { Frame } from './Frame';
import { ObjectiveRow } from './ObjectiveRow';
import { useSystem } from '../state/SystemContext';
import { dueHabitsOn, isMetOn, logKey } from '../system/streaks';
import type { Habit } from '../types';

/** Quest names cycle by date so the panel does not read identically forever. */
const QUEST_NAMES = [
  'Iron Discipline', 'Strange Training', 'The Long Road',
  'Quiet Resolve', 'Sharpened Edge', 'Steady Hand', 'The Daily Ordeal',
];

export function DailyQuest() {
  const { snapshot, index, today, tickHabit } = useSystem();
  const due = dueHabitsOn(snapshot.habits, today, index);
  const cleared = due.filter((h) => isMetOn(h, today, index)).length;
  // Tracks the one habit currently mid-tick so its button can be disabled
  // while the await gap in tickHabit is in flight — otherwise a fast double
  // click can both observe `cleared && !bonusAlready` and both insert the
  // quest_bonus row before either write lands.
  const [ticking, setTicking] = useState<string | null>(null);

  const dayNumber = Number(today.replaceAll('-', '')) % QUEST_NAMES.length;
  const questName = QUEST_NAMES[dayNumber];

  async function onToggle(h: Habit, met: boolean) {
    setTicking(h.id);
    try {
      await tickHabit(h, met ? 0 : h.target_count);
    } finally {
      setTicking(null);
    }
  }

  return (
    <Frame title="Daily Quest" meta={`${cleared} / ${due.length} CLEARED`}>
      <div className="quest__intro">
        <h2 className="quest__name">[Daily Quest: <em>{questName}</em>] has arrived.</h2>
        <p className="quest__sub">RESETS AT MIDNIGHT · BONUS +100 EXP ON FULL CLEAR</p>
      </div>

      {due.length === 0 ? (
        <p className="quest__empty">No objectives due today. Add habits from a domain page.</p>
      ) : (
        due.map((h) => {
          const count = index.get(logKey(h.id, today)) ?? 0;
          const met = isMetOn(h, today, index);
          return (
            <ObjectiveRow
              key={h.id} habit={h} count={count} met={met} busy={ticking === h.id}
              onToggle={() => void onToggle(h, met)}
            />
          );
        })
      )}

      <p className="warn">
        <span>
          <b>WARNING</b> — Failure to complete the daily quest resets the active
          streak and applies a −40 EXP debt.
        </span>
      </p>
    </Frame>
  );
}
