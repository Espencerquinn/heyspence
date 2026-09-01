import { addDays, todayISO } from '../system/dates';
import { listHabits } from './habits';
import { listLogs } from './habitLogs';
import { listEvents } from './xpEvents';
import { listTitles } from './titles';
import { listPenalties } from './penalties';
import { listGoals, listMilestones } from './goals';
import { listTasks } from './tasks';
import type { Goal, Habit, HabitLog, Milestone, Penalty, Task, TitleRow, XpEvent } from '../types';

export interface Snapshot {
  habits: Habit[];
  logs: HabitLog[];
  events: XpEvent[];
  titles: TitleRow[];
  penalties: Penalty[];
  goals: Goal[];
  milestones: Milestone[];
  tasks: Task[];
}

export async function loadSnapshot(): Promise<Snapshot> {
  const since = addDays(todayISO(), -400);
  const [habits, logs, events, titles, penalties, goals, milestones, tasks] = await Promise.all([
    listHabits(), listLogs(since), listEvents(), listTitles(), listPenalties(),
    listGoals(), listMilestones(), listTasks(),
  ]);
  return { habits, logs, events, titles, penalties, goals, milestones, tasks };
}
