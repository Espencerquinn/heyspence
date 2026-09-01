import { Frame } from '../ui/Frame';
import { GoalCard } from '../ui/GoalCard';
import { GoalForm } from '../ui/GoalForm';
import { TaskList } from '../ui/TaskList';
import { HabitEditor } from '../ui/HabitEditor';
import { HabitRow } from '../ui/HabitRow';
import { useSystem } from '../state/SystemContext';
import { DOMAIN_COLOR, DOMAIN_LABEL, STAT_OF, type Domain } from '../types';
import { statProgress } from '../system/stats';

export function DomainScreen({ domain }: { domain: Domain }) {
  const { snapshot, player } = useSystem();
  const stat = STAT_OF[domain];
  const progress = statProgress(player.domainXp[domain]);
  const goals = snapshot.goals.filter((g) => g.domain === domain && g.status === 'active');
  const habits = snapshot.habits.filter((h) => h.domain === domain && !h.archived_at);
  const tasks = snapshot.tasks.filter((t) => t.domain === domain);

  return (
    <div className="domain" style={{ ['--k' as string]: DOMAIN_COLOR[domain] }}>
      <Frame
        title={DOMAIN_LABEL[domain]}
        meta={`${stat} ${progress.level} · ${Math.round(progress.pct)}% TO ${progress.level + 1}`}
      >
        <div className="domain__bar"><i style={{ width: `${progress.pct}%` }} /></div>
      </Frame>

      <Frame title="Quest Lines" meta={`${goals.length} ACTIVE`}>
        {goals.length === 0
          ? <p className="quest__empty">No active goals in this domain.</p>
          : goals.map((g) => (
              <GoalCard key={g.id} goal={g}
                        milestones={snapshot.milestones.filter((m) => m.goal_id === g.id)} />
            ))}
        <GoalForm domain={domain} />
      </Frame>

      <Frame title="Habits" meta={`${habits.length} TRACKED`}>
        {habits.map((h) => <HabitRow key={h.id} habit={h} />)}
        <HabitEditor domain={domain} />
      </Frame>

      <Frame title="Backlog" meta={`${tasks.length} OPEN`}>
        <TaskList domain={domain} tasks={tasks} />
      </Frame>
    </div>
  );
}
