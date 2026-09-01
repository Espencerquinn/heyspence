import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import { loadSnapshot, type Snapshot } from '../data/snapshot';
import { setLog } from '../data/habitLogs';
import { award, revokeHabitAward } from '../data/xpEvents';
import { derivePlayer, type PlayerState } from '../system/derive';
import { buildLogIndex, isMetOn } from '../system/streaks';
import { todayISO } from '../system/dates';
import type { Habit } from '../types';

interface SystemValue {
  snapshot: Snapshot;
  player: PlayerState;
  index: Map<string, number>;
  today: string;
  reload: () => Promise<void>;
  tickHabit: (habit: Habit, count: number) => Promise<void>;
}

const Ctx = createContext<SystemValue | null>(null);

export function SystemProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string>('');
  const today = todayISO();

  const reload = useCallback(async () => {
    try { setSnapshot(await loadSnapshot()); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const index = useMemo(
    () => buildLogIndex(snapshot?.logs ?? []), [snapshot]);

  const player = useMemo(
    () => derivePlayer(snapshot?.events ?? [], snapshot?.habits ?? [], index, today),
    [snapshot, index, today]);

  const tickHabit = useCallback(async (habit: Habit, count: number) => {
    const wasMet = isMetOn(habit, today, index);
    const willBeMet = count >= habit.target_count;
    await setLog(habit.id, today, count);
    if (willBeMet && !wasMet) {
      await award({ amount: habit.xp_value, kind: 'habit', domain: habit.domain,
                    refId: habit.id, occurredOn: today });
    } else if (!willBeMet && wasMet) {
      await revokeHabitAward(habit.id, today);
    }
    await reload();
  }, [today, index, reload]);

  if (error) return <div className="boot boot--error">SYSTEM ERROR — {error}</div>;
  if (!snapshot) return <div className="boot">LOADING PLAYER DATA…</div>;

  return (
    <Ctx.Provider value={{ snapshot, player, index, today, reload, tickHabit }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSystem(): SystemValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSystem must be used inside <SystemProvider>');
  return v;
}
