import { useState } from 'react';
import { Frame } from './Frame';
import { useSystem } from '../state/SystemContext';
import { navigate } from '../router';
import { dueHabitsOn, isMetOn } from '../system/streaks';
import { isProtocol, nextDueLabel } from '../system/protocol';
import type { Habit } from '../types';

const timeOf = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

/**
 * Meds and supplements due today, first thing on STATUS. They are ordinary
 * habits underneath (they count toward the Daily Quest), shown with dose and
 * the time each was taken.
 */
export function MorningProtocol() {
  const { snapshot, index, today, tickHabit } = useSystem();
  const [busy, setBusy] = useState<string | null>(null);

  const protocol = snapshot.habits.filter((h) => isProtocol(h) && !h.archived_at);
  const due = dueHabitsOn(protocol, today, index);
  const taken = due.filter((h) => isMetOn(h, today, index)).length;
  const upcoming = protocol
    .filter((h) => !due.includes(h))
    .map((h) => ({ h, next: nextDueLabel(h, today) }))
    .filter((x) => x.next);
  const takenAt = (h: Habit) =>
    snapshot.logs.find((l) => l.habit_id === h.id && l.log_date === today)?.created_at;

  async function toggle(h: Habit, met: boolean) {
    setBusy(h.id);
    try { await tickHabit(h, met ? 0 : h.target_count); } finally { setBusy(null); }
  }

  return (
    <Frame
      title="Morning Protocol"
      className="protocol"
      meta={<button type="button" className="linkish" onClick={() => navigate('protocol')}>
        {due.length ? `${taken} / ${due.length} TAKEN` : 'MANAGE'} ›
      </button>}
    >
      {due.length === 0 ? (
        <p className="quest__empty">
          {protocol.length ? 'Nothing scheduled today.' : 'No meds or supplements yet — add them on the Protocol page.'}
        </p>
      ) : (
        due.map((h) => {
          const met = isMetOn(h, today, index);
          return (
            <button key={h.id} type="button" className="obj obj--rx" aria-pressed={met}
                    disabled={busy === h.id} onClick={() => void toggle(h, met)}>
              <span className="box" aria-hidden="true" />
              <span className="obj__body">
                <span className="obj__name">{h.name}</span>
                <span className="obj__meta">
                  <span className="chip">{h.kind === 'medication' ? 'RX' : 'SUPP'}</span>
                  {met ? `TAKEN ${timeOf(takenAt(h))}` : 'DUE TODAY'}
                </span>
              </span>
              <span className="obj__count">{h.dose ?? ''}</span>
            </button>
          );
        })
      )}
      {upcoming.length > 0 && (
        <p className="protocol__next">
          NEXT · {upcoming.map(({ h, next }) => `${h.name} ${next}`).join(' · ')}
        </p>
      )}
    </Frame>
  );
}
