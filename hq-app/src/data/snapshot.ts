import { addDays, todayISO } from '../system/dates';
import { listHabits } from './habits';
import { listLogs } from './habitLogs';
import { listEvents } from './xpEvents';
import { listTitles } from './titles';
import { listPenalties } from './penalties';
import { listGoals, listMilestones } from './goals';
import { listTasks } from './tasks';
import { listEntries } from './journal';
import { listPhotos } from './photos';
import { listHealth, listWorkouts } from './health';
import type {
  Goal, Habit, HabitLog, HealthDaily, JournalEntry, Milestone, Penalty, ProgressPhoto, Task, TitleRow, Workout, XpEvent,
} from '../types';

export interface Snapshot {
  habits: Habit[];
  logs: HabitLog[];
  events: XpEvent[];
  titles: TitleRow[];
  penalties: Penalty[];
  goals: Goal[];
  milestones: Milestone[];
  tasks: Task[];
  journal: JournalEntry[];
  photos: ProgressPhoto[];
  health: HealthDaily[];     // last 60 days
  workouts: Workout[];       // last 60 days
}

export async function loadSnapshot(): Promise<Snapshot> {
  const since = addDays(todayISO(), -400);
  const recent = addDays(todayISO(), -60);
  const [habits, logs, events, titles, penalties, goals, milestones, tasks, journal, photos,
         health, workouts] =
    await Promise.all([
      listHabits(), listLogs(since), listEvents(), listTitles(), listPenalties(),
      listGoals(), listMilestones(), listTasks(), listEntries(), listPhotos(),
      listHealth(recent), listWorkouts(recent),
    ]);
  return { habits, logs, events, titles, penalties, goals, milestones, tasks, journal, photos,
           health, workouts };
}
