import { DOMAIN_COLOR, STAT_OF, type Habit } from '../types';

export function ObjectiveRow(props: {
  habit: Habit; count: number; met: boolean; onToggle: () => void;
}) {
  const { habit, count, met, onToggle } = props;
  const partial = habit.target_count > 1;
  const pct = Math.min(100, (count / habit.target_count) * 100);

  return (
    <button
      type="button"
      className="obj"
      aria-pressed={met}
      style={{ ['--k' as string]: DOMAIN_COLOR[habit.domain] }}
      onClick={onToggle}
    >
      <span className="box" aria-hidden="true" />
      <span className="obj__body">
        <span className="obj__name">{habit.name}</span>
        <span className="obj__meta">
          <span className="chip">{STAT_OF[habit.domain]}</span>+{habit.xp_value} EXP
        </span>
      </span>
      <span className="obj__count">
        [{count.toLocaleString()}/{habit.target_count.toLocaleString()}]
      </span>
      {partial && !met && (
        <span className="obj__bar"><i style={{ width: `${pct}%` }} /></span>
      )}
    </button>
  );
}
