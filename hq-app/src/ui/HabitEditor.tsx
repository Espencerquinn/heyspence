import { useState } from 'react';
import { createHabit } from '../data/habits';
import { useSystem } from '../state/SystemContext';
import type { Cadence, Domain } from '../types';
import { XP } from '../system/xp';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Single-row "add a habit" form at the bottom of a domain's Habits panel. */
export function HabitEditor({ domain }: { domain: Domain }) {
  const { snapshot, reload } = useSystem();
  const [name, setName] = useState('');
  const [cadence, setCadence] = useState<Cadence>('daily');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [targetPerWeek, setTargetPerWeek] = useState(3);
  const [targetCount, setTargetCount] = useState(1);
  const [xpValue, setXpValue] = useState<number>(XP.habitDefault);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const domainHabits = snapshot.habits.filter((h) => h.domain === domain);

  function toggleWeekday(d: number) {
    setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  }

  function resetForm() {
    setName(''); setCadence('daily'); setWeekdays([]);
    setTargetPerWeek(3); setTargetCount(1); setXpValue(XP.habitDefault);
  }

  async function onSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError('');
    setBusy(true);
    try {
      await createHabit({
        name: trimmed,
        domain,
        cadence,
        weekdays: cadence === 'weekdays' ? weekdays : null,
        target_per_week: cadence === 'n_per_week' ? targetPerWeek : null,
        target_count: targetCount,
        xp_value: xpValue,
        sort_order: domainHabits.length * 10,
        archived_at: null,
      });
      resetForm();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="habit-form">
      <div className="habit-form__row">
        <input className="field" type="text" placeholder="New habit name" value={name}
               onChange={(e) => setName(e.target.value)} aria-label="Habit name" />
        <select className="field" value={cadence} aria-label="Cadence"
                onChange={(e) => setCadence(e.target.value as Cadence)}>
          <option value="daily">Daily</option>
          <option value="weekdays">Weekdays</option>
          <option value="n_per_week">N per week</option>
        </select>
        {cadence === 'n_per_week' && (
          <input className="field field--num" type="number" min={1} value={targetPerWeek}
                 onChange={(e) => setTargetPerWeek(Number(e.target.value))}
                 aria-label="Times per week" />
        )}
        <input className="field field--num" type="number" min={1} value={targetCount}
               onChange={(e) => setTargetCount(Number(e.target.value))}
               aria-label="Target count" />
        <input className="field field--num" type="number" min={0} value={xpValue}
               onChange={(e) => setXpValue(Number(e.target.value))} aria-label="EXP value" />
        <button className="btn" type="button" disabled={busy || !name.trim()}
                onClick={() => void onSubmit()}>
          Add habit
        </button>
      </div>

      {cadence === 'weekdays' && (
        <div className="habit-form__weekdays">
          {WEEKDAY_LABELS.map((label, d) => (
            <label className="weekday" key={d}>
              <input type="checkbox" checked={weekdays.includes(d)}
                     onChange={() => toggleWeekday(d)} />
              {label}
            </label>
          ))}
        </div>
      )}

      {error && <p className="inline-error">{error}</p>}
    </div>
  );
}
