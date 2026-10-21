import { useState } from 'react';
import { Frame } from '../ui/Frame';
import { useSystem } from '../state/SystemContext';
import { archiveHabit, createHabit, restoreHabit, updateHabit } from '../data/habits';
import { addDays, eachDay, formatShort } from '../system/dates';
import { isDueOn, isMetOn } from '../system/streaks';
import { isProtocol, scheduleLabel, WEEKDAY_SHORT } from '../system/protocol';
import type { Cadence, Habit, HabitKind } from '../types';

/**
 * Meds & supplements: edit dose and schedule, pause and resume, and see the
 * last two weeks of adherence. Pausing archives the habit; resuming moves its
 * active_from to today so the paused days are never counted as missed.
 */
export function Protocol() {
  const { snapshot } = useSystem();
  const items = snapshot.habits.filter(isProtocol)
    .sort((a, b) => Number(!!a.archived_at) - Number(!!b.archived_at) || a.sort_order - b.sort_order);

  return (
    <div className="domain protocol-page">
      <Frame title="Protocol" meta={`${items.filter((h) => !h.archived_at).length} ACTIVE`}>
        <p className="hint hint--pad">
          Meds and supplements show up in the Morning Protocol on the days they are due. Pausing one
          hides it without counting the paused days as missed.
        </p>
      </Frame>
      {items.map((h) => <ProtocolCard key={h.id} habit={h} />)}
      <AddProtocol nextSort={items.length + 1} />
    </div>
  );
}

function ProtocolCard({ habit }: { habit: Habit }) {
  const { index, today, reload } = useSystem();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const paused = !!habit.archived_at;

  const days = eachDay(addDays(today, -13), today);
  const due = days.filter((d) => isDueOn(habit, d, index));
  const taken = due.filter((d) => isMetOn(habit, d, index)).length;

  async function act(fn: () => Promise<void>) {
    setBusy(true); setError('');
    try { await fn(); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  return (
    <Frame title={habit.name} className={paused ? 'is-paused' : ''}
           meta={paused ? 'PAUSED' : `${habit.kind === 'medication' ? 'RX' : 'SUPP'} · ${scheduleLabel(habit)}`}>
      <div className="rx">
        <div className="rx__dose">
          <small>DOSE</small><span>{habit.dose || '—'}</span>
        </div>
        {!paused && (
          <div className="rx__adh" aria-label={`Taken ${taken} of ${due.length} scheduled doses in 14 days`}>
            <small>LAST 14 DAYS · {taken}/{due.length}</small>
            <div className="adh">
              {days.map((d) => {
                const isDue = isDueOn(habit, d, index);
                const met = isMetOn(habit, d, index);
                const cls = !isDue ? 'off' : met ? 'hit' : d === today ? 'open' : 'miss';
                return <i key={d} className={`adh__d adh__d--${cls}`} title={`${formatShort(d)} — ${cls}`} />;
              })}
            </div>
          </div>
        )}
        <div className="rx__actions">
          {!paused && <button type="button" className="ghost" onClick={() => setEditing(!editing)}>
            {editing ? 'Close' : 'Edit'}
          </button>}
          {paused
            ? <button type="button" className="btn btn--sm" disabled={busy}
                      onClick={() => void act(() => restoreHabit(habit.id, today))}>Resume</button>
            : <button type="button" className="ghost" disabled={busy}
                      onClick={() => void act(() => archiveHabit(habit.id))}>Pause</button>}
        </div>
      </div>
      {editing && (
        <RxForm
          initial={habit}
          submitLabel="Save"
          onSubmit={(v) => act(async () => {
            // A schedule change would otherwise re-judge past days under the new
            // days and fine them; restart the item's history from today instead.
            const rescheduled = v.cadence !== habit.cadence
              || [...(v.weekdays ?? [])].join() !== [...(habit.weekdays ?? [])].sort().join();
            await updateHabit(habit.id, rescheduled ? { ...v, active_from: today } : v);
            setEditing(false);
          })}
        />
      )}
      {error && <p className="inline-error">{error}</p>}
    </Frame>
  );
}

type RxValues = Pick<Habit, 'name' | 'dose' | 'kind' | 'cadence' | 'weekdays' | 'target_per_week'>;

function RxForm(props: { initial?: Partial<Habit>; submitLabel: string; onSubmit: (v: RxValues) => Promise<void> }) {
  const { initial, submitLabel, onSubmit } = props;
  const [name, setName] = useState(initial?.name ?? '');
  const [dose, setDose] = useState(initial?.dose ?? '');
  const [kind, setKind] = useState<HabitKind>(initial?.kind ?? 'medication');
  // The form offers Daily or specific days. "N per week" is deliberately not
  // offered for meds: it reads as due every day until the count is met, which
  // fines every skipped day — wrong for a dose on a fixed schedule.
  const [cadence, setCadence] = useState<Cadence>(initial?.cadence === 'weekdays' ? 'weekdays' : 'daily');
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? []);
  const [busy, setBusy] = useState(false);

  const valid = name.trim() && (cadence === 'daily' || weekdays.length > 0);

  return (
    <form className="habit-form" onSubmit={async (ev) => {
      ev.preventDefault();
      if (!valid) return;
      setBusy(true);
      try {
        await onSubmit({
          name: name.trim(), dose: dose.trim() || null, kind, cadence,
          weekdays: cadence === 'weekdays' ? [...weekdays].sort() : null, target_per_week: null,
        });
      } finally { setBusy(false); }
    }}>
      <div className="habit-form__row">
        <input className="field" placeholder="Name" value={name} aria-label="Name"
               onChange={(e) => setName(e.target.value)} />
        <input className="field" placeholder="Dose (40 units)" value={dose} aria-label="Dose"
               onChange={(e) => setDose(e.target.value)} />
        <select className="field" value={kind} aria-label="Type"
                onChange={(e) => setKind(e.target.value as HabitKind)}>
          <option value="medication">Medication</option>
          <option value="supplement">Supplement</option>
        </select>
        <select className="field" value={cadence} aria-label="Schedule"
                onChange={(e) => setCadence(e.target.value as Cadence)}>
          <option value="daily">Daily</option>
          <option value="weekdays">Specific days</option>
        </select>
        <button className="btn btn--sm" disabled={busy || !valid}>{submitLabel}</button>
      </div>
      {cadence === 'weekdays' && (
        <div className="habit-form__weekdays">
          {WEEKDAY_SHORT.map((label, d) => (
            <label className="weekday" key={d}>
              <input type="checkbox" checked={weekdays.includes(d)}
                     onChange={() => setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]))} />
              {label}
            </label>
          ))}
        </div>
      )}
    </form>
  );
}

function AddProtocol({ nextSort }: { nextSort: number }) {
  const { today, reload } = useSystem();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  return (
    <Frame title="Add" meta={<button type="button" className="linkish" onClick={() => setOpen(!open)}>
      {open ? 'CLOSE' : 'NEW MED / SUPPLEMENT ›'}
    </button>}>
      {open && (
        <RxForm submitLabel="Add" onSubmit={async (v) => {
          setError('');
          try {
            await createHabit({
              ...v, domain: 'physical', target_count: 1, xp_value: 10,
              sort_order: nextSort, archived_at: null, active_from: today,
            });
            setOpen(false);
            await reload();
          } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
        }} />
      )}
      {error && <p className="inline-error">{error}</p>}
    </Frame>
  );
}
