import { addDays, todayISO } from '../system/dates';
import { listHabits } from './habits';
import { listLogs } from './habitLogs';
import { listEvents } from './xpEvents';
import { listTitles } from './titles';
import { listPenalties } from './penalties';
import type { Habit, HabitLog, Penalty, TitleRow, XpEvent } from '../types';

export interface Snapshot {
  habits: Habit[];
  logs: HabitLog[];
  events: XpEvent[];
  titles: TitleRow[];
  penalties: Penalty[];
}

export async function loadSnapshot(): Promise<Snapshot> {
  const since = addDays(todayISO(), -400);
  const [habits, logs, events, titles, penalties] = await Promise.all([
    listHabits(), listLogs(since), listEvents(), listTitles(), listPenalties(),
  ]);
  return { habits, logs, events, titles, penalties };
}
