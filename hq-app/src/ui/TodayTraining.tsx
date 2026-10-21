import { Frame } from './Frame';
import { useSystem } from '../state/SystemContext';
import { navigate } from '../router';
import { coreDayFor, suggestTraining } from '../system/training';

/** Weekly strength target: the habit Tonal sessions auto-tick, else 4. */
export function useWeeklyTarget(): number {
  const { snapshot } = useSystem();
  const gym = snapshot.habits.find((h) => h.auto_source === 'strength' && !h.archived_at);
  return gym?.target_per_week ?? 4;
}

export function TodayTraining() {
  const { snapshot, today } = useSystem();
  const weeklyTarget = useWeeklyTarget();
  const call = suggestTraining({ today, workouts: snapshot.workouts, weeklyTarget });
  const core = coreDayFor(today);

  return (
    <Frame
      title="Today's Training"
      className="training"
      meta={<button type="button" className="linkish" onClick={() => navigate('train')}>
        TONAL {call.doneThisWeek}/{weeklyTarget} WK ›
      </button>}
    >
      <div className={`train-call train-call--${call.kind}`}>
        <span className="train-call__tag">
          {call.kind === 'strength' ? 'TONAL' : call.kind === 'done' ? 'DONE' : 'RECOVER'}
        </span>
        <div>
          <h3 className="train-call__focus">{call.focus}</h3>
          <p className="train-call__detail">{call.detail}</p>
        </div>
      </div>
      <div className="core-mini">
        <p className="core-mini__head">CORE CIRCUIT {core.code} · {core.name.toUpperCase()} · ~10 MIN</p>
        <ul className="core-mini__list">
          {core.moves.map((m) => (
            <li key={m.name}><span>{m.name}</span><b>{m.dose}</b></li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}
