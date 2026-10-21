import { Frame } from '../ui/Frame';
import { useWeeklyTarget } from '../ui/TodayTraining';
import { useSystem } from '../state/SystemContext';
import { CORE_DAYS, coreDayFor, suggestTraining } from '../system/training';
import { isStrength } from '../system/autotick';
import { addDays, eachDay, formatShort } from '../system/dates';

const INGEST_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hq-health-ingest`;

export function Train() {
  const { snapshot, today } = useSystem();
  const weeklyTarget = useWeeklyTarget();
  const call = suggestTraining({ today, workouts: snapshot.workouts, weeklyTarget });
  const todayCore = coreDayFor(today);

  const last14 = eachDay(addDays(today, -13), today);
  const steps = new Map(snapshot.health.filter((h) => h.metric === 'steps')
    .map((h) => [h.metric_date, Number(h.value)] as const));
  const maxSteps = Math.max(10000, ...last14.map((d) => steps.get(d) ?? 0));
  const recent = [...snapshot.workouts].reverse().slice(0, 12);

  return (
    <div className="domain train">
      <Frame title="Today" meta={`TONAL ${call.doneThisWeek}/${weeklyTarget} THIS WEEK`}>
        <div className={`train-call train-call--${call.kind}`}>
          <span className="train-call__tag">
            {call.kind === 'strength' ? 'TONAL' : call.kind === 'done' ? 'DONE' : 'RECOVER'}
          </span>
          <div>
            <h3 className="train-call__focus">{call.focus}</h3>
            <p className="train-call__detail">{call.detail}</p>
          </div>
        </div>
      </Frame>

      <Frame title="Core Circuits" meta={`TODAY · ${todayCore.code}`}>
        <div className="circuits">
          {CORE_DAYS.map((day) => (
            <div key={day.code} className={`circuit ${day.code === todayCore.code ? 'circuit--today' : ''}`}>
              <p className="circuit__head">{day.code} · {day.name.toUpperCase()}</p>
              {day.moves.map((m) => (
                <div className="move" key={m.name}>
                  <div className="move__top"><span>{m.name}</span><b>{m.dose}</b></div>
                  <p className="move__cue">{m.cue}</p>
                  <p className="move__prog">PROGRESS → {m.progress}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="hint hint--pad">
          Rotate A → B → C daily, about 10 minutes, after Tonal or on its own. Add reps or seconds each week;
          when a move gets easy, take the progression instead of doing more sets. Daily ab work builds the
          muscle — whether it shows is set by body fat, which is the Fuel page's job.
        </p>
      </Frame>

      <Frame title="Steps" meta="LAST 14 DAYS">
        {steps.size === 0
          ? <p className="quest__empty">No step data synced yet.</p>
          : (
            <div className="bars" role="img" aria-label="Daily steps, last 14 days">
              {last14.map((d) => {
                const v = steps.get(d) ?? 0;
                return (
                  <div className="bars__col" key={d} title={`${formatShort(d)}: ${v.toLocaleString()} steps`}>
                    <i className={v >= 10000 ? 'bars__hit' : ''} style={{ height: `${(v / maxSteps) * 100}%` }} />
                    <small>{formatShort(d).slice(0, 1)}</small>
                  </div>
                );
              })}
            </div>
          )}
      </Frame>

      <Frame title="Workouts" meta={`${recent.length} RECENT`}>
        {recent.length === 0
          ? <p className="quest__empty">No workouts synced yet. Tonal writes its sessions to Apple Health; they arrive here with the next sync.</p>
          : recent.map((w) => (
              <div className="food-row" key={w.id}>
                <span className="food-row__body">
                  <span className="food-row__name">{isStrength(w) ? '◆ ' : ''}{w.name}</span>
                  <span className="food-row__meta">
                    {formatShort(w.workout_date)}{w.source ? ` · ${w.source}` : ''}
                    {w.duration_min ? ` · ${Math.round(Number(w.duration_min))} min` : ''}
                    {w.active_kcal ? ` · ${Math.round(Number(w.active_kcal))} kcal` : ''}
                    {w.avg_hr ? ` · ${Math.round(Number(w.avg_hr))} bpm avg` : ''}
                  </span>
                </span>
              </div>
            ))}
      </Frame>

      <Frame title="Health Sync" meta={snapshot.health.length ? 'CONNECTED' : 'SETUP'}>
        <ol className="setup">
          <li>Install <b>Health Auto Export</b> on the iPhone and unlock Premium (automations need it).</li>
          <li>Automations → New → <b>REST API</b>. URL: <code>{INGEST_URL}</code></li>
          <li>Headers: <code>Authorization</code> = <code>Bearer &lt;token&gt;</code> (token is in <code>hq-backend/.hq-ingest.env</code>).</li>
          <li>Format <b>JSON</b>, Aggregation <b>Days</b>, Period <b>Last 7 days</b>, Sync every hour. Each delivery carries whole-day totals, so re-sending a day just overwrites it.</li>
          <li>Metrics: Step Count, Active Energy, Exercise Time, Resting Heart Rate, HRV, Sleep Analysis, Weight, Body Fat %. Turn on <b>Workouts</b>.</li>
          <li>In the Tonal app: Settings → Apple Health → on, so sessions land in Health (and from there, here).</li>
        </ol>
      </Frame>
    </div>
  );
}
