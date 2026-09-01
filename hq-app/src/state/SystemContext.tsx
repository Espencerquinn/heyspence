import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import { loadSnapshot, type Snapshot } from '../data/snapshot';
import { setLog } from '../data/habitLogs';
import { award, revokeHabitAward } from '../data/xpEvents';
import { recordPenalty } from '../data/penalties';
import { unlockTitle } from '../data/titles';
import { derivePlayer, isDayCleared, type PlayerState } from '../system/derive';
import { rankFromLevel } from '../system/levels';
import { buildLogIndex, isMetOn } from '../system/streaks';
import { addDays, todayISO } from '../system/dates';
import { evaluateTitles, emptyTitleContext } from '../system/titles';
import { planCatchup } from '../system/catchup';
import { XP, playerTotal } from '../system/xp';
import { useNotify } from './useNotifications';
import {
  DOMAIN_COLOR, DOMAIN_OF, DOMAINS, STAT_KEYS,
  type Domain, type Habit, type HabitLog, type TitleRow,
} from '../types';

interface SystemValue {
  snapshot: Snapshot;
  player: PlayerState;
  index: Map<string, number>;
  today: string;
  reload: () => Promise<void>;
  tickHabit: (habit: Habit, count: number) => Promise<void>;
}

const Ctx = createContext<SystemValue | null>(null);

/** Per-domain count of days logged, used to evaluate log-count-based titles. */
function countLogsByDomain(habits: Habit[], logs: HabitLog[]): Record<Domain, number> {
  const byId = new Map(habits.map((h) => [h.id, h.domain] as const));
  const out = Object.fromEntries(DOMAINS.map((d) => [d, 0])) as Record<Domain, number>;
  for (const l of logs) {
    const d = byId.get(l.habit_id);
    if (d) out[d] += 1;
  }
  return out;
}

/**
 * Runs the catch-up penalty evaluation over the gap between the player's
 * earliest history and yesterday. Idempotent: already-penalized dates are
 * skipped via `alreadyPenalized`, and each write is additionally guarded by
 * `recordPenalty`'s genuine-insert signal so a concurrent second run of this
 * same effect (React StrictMode's double invocation in dev, or two open
 * tabs in production) cannot double-award the XP loss even though the
 * `penalties` primary key already prevents a duplicate row.
 *
 * Returns the total EXP actually applied by THIS call; 0 means nothing new
 * happened (caller should skip the reload and the notice).
 */
async function runCatchup(snap: Snapshot, today: string): Promise<number> {
  // Never penalize days before the player started playing. With seeded habits and
  // no history, a brand-new install would otherwise fire a PENALTY panel for
  // "yesterday" on the very first sign-in — punishing the user for a day they did
  // not have the app. If there is no history at all, there is nothing to catch up on.
  const started = [
    ...snap.logs.map((l) => l.log_date),
    ...snap.events.map((e) => e.occurred_on),
  ].sort()[0];
  if (!started) return 0;

  const plan = planCatchup({
    fromDate: started,
    throughDate: addDays(today, -1),   // never penalize today; it is still live
    habits: snap.habits,
    index: buildLogIndex(snap.logs),
    alreadyPenalized: new Set(snap.penalties.map((p) => p.penalty_date)),
    totalXp: playerTotal(snap.events),
  });
  if (plan.penalties.length === 0) return 0;

  let applied = 0;
  for (const p of plan.penalties) {
    const inserted = await recordPenalty({
      penalty_date: p.date, missed_habit_ids: p.missedHabitIds,
      xp_lost: p.xpLost, streak_before: 0,
    });
    // Award — and count toward the reported total — only on a genuine
    // insert. A conflict means a concurrent run already recorded (and
    // awarded) this day; awarding again here would double-deduct EXP that
    // the `penalties` table's own uniqueness can't protect, since the
    // xp_events ledger has no matching unique index for kind='penalty'.
    if (inserted && p.xpLost > 0) {
      await award({ amount: -p.xpLost, kind: 'penalty', occurredOn: p.date });
      applied += p.xpLost;
    }
  }
  return applied;
}

export function SystemProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string>('');
  const today = todayISO();
  const notify = useNotify();

  const reload = useCallback(async () => {
    // Clear any prior failure first: without this, one transient error strands
    // the UI in the SYSTEM ERROR branch permanently, and the retry control
    // lives inside the subtree that stopped rendering.
    setError('');
    try { setSnapshot(await loadSnapshot()); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const snap = await loadSnapshot();
      if (cancelled) return;
      const lost = await runCatchup(snap, today);
      const fresh = lost > 0 ? await loadSnapshot() : snap;
      if (cancelled) return;
      setSnapshot(fresh);
      if (lost > 0) {
        // Real post-catch-up streak, not an assumed 0: a large backlog can
        // still leave a non-zero streak once today's quest is cleared, and a
        // partial gap (habits with nothing due) never severed it at all.
        const freshIndex = buildLogIndex(fresh.logs);
        const streak = derivePlayer(fresh.events, fresh.habits, freshIndex, today).questStreak;
        notify({
          tone: 'penalty', kind: 'PENALTY', huge: 'QUEST FAILED',
          lead: 'Days passed with the daily quest uncompleted. The streak has been severed.',
          deltas: [{ text: `−${lost} EXP` }, { text: `STREAK → ${streak}` }],
          fine: 'One missed day is data, not a verdict. Clear today to begin again.',
        });
      }
    })().catch((e) => setError(e instanceof Error ? e.message : String(e)));
    return () => { cancelled = true; };
  }, [today, notify]);

  const index = useMemo(
    () => buildLogIndex(snapshot?.logs ?? []), [snapshot]);

  const player = useMemo(
    () => derivePlayer(snapshot?.events ?? [], snapshot?.habits ?? [], index, today),
    [snapshot, index, today]);

  const tickHabit = useCallback(async (habit: Habit, count: number) => {
    try {
      const before = player;
      const wasMet = isMetOn(habit, today, index);
      const willBeMet = count >= habit.target_count;

      await setLog(habit.id, today, count);
      if (willBeMet && !wasMet) {
        await award({ amount: habit.xp_value, kind: 'habit', domain: habit.domain,
                      refId: habit.id, occurredOn: today });
      } else if (!willBeMet && wasMet) {
        await revokeHabitAward(habit.id, today);
      }

      // Re-read, then decide what the System has to say about it.
      let next = await loadSnapshot();
      let nextIndex = buildLogIndex(next.logs);

      // Full clear? Award the bonus once, then re-read again so the bonus counts.
      const cleared = isDayCleared(next.habits, nextIndex, today);
      const bonusAlready = next.events.some(
        (e) => e.kind === 'quest_bonus' && e.occurred_on === today);
      if (cleared && !bonusAlready) {
        await award({ amount: XP.questBonus, kind: 'quest_bonus', occurredOn: today });
        next = await loadSnapshot();
        nextIndex = buildLogIndex(next.logs);
      }

      const after = derivePlayer(next.events, next.habits, nextIndex, today);
      setSnapshot(next);

      if (cleared && !bonusAlready) {
        notify({
          kind: 'NOTIFICATION',
          huge: 'QUEST CLEARED',
          lead: 'The daily quest is complete. The System acknowledges your effort.',
          deltas: [
            { text: `+${XP.questBonus} BONUS` },
            { text: `STREAK ${after.questStreak}`, color: DOMAIN_COLOR.social },
          ],
        });
      }

      if (after.level > before.level) {
        notify({
          kind: 'LEVEL UP',
          huge: `LV. ${after.level}`,
          lead: `You have reached Level ${after.level}.`,
          deltas: STAT_KEYS
            .filter((k) => after.statLevels[k] > before.statLevels[k])
            .map((k) => ({ text: `${k} +${after.statLevels[k] - before.statLevels[k]}`,
                           color: DOMAIN_COLOR[DOMAIN_OF[k]] })),
        });
      }

      if (rankFromLevel(after.level) !== rankFromLevel(before.level)) {
        notify({
          kind: 'RANK UP',
          huge: `RANK ${after.rank}`,
          lead: `The System has re-evaluated you. You are now Rank ${after.rank}.`,
        });
      }

      // Titles
      const ctx = {
        ...emptyTitleContext(),
        currentStreak: after.questStreak,
        longestStreak: after.questStreak,
        statLevels: after.statLevels,
        domainLogCounts: countLogsByDomain(next.habits, next.logs),
        journalCount: 0,
      };
      const unlocked = new Set(next.titles.map((t) => t.code));
      const unlockedNow: TitleRow[] = [];
      for (const t of evaluateTitles(ctx, unlocked)) {
        await unlockTitle(t.code);
        unlockedNow.push({ code: t.code, unlocked_at: new Date().toISOString() });
        notify({
          kind: 'TITLE ACQUIRED', huge: t.name.toUpperCase(),
          lead: t.detail, fine: 'Equipped automatically. Visible on your status window.',
        });
      }
      if (unlockedNow.length > 0) {
        setSnapshot({ ...next, titles: [...next.titles, ...unlockedNow] });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [today, index, player, notify]);

  if (error) {
    return (
      <div className="boot boot--error">
        <p>SYSTEM ERROR — {error}</p>
        <button className="btn" onClick={() => void reload()}>Retry</button>
      </div>
    );
  }
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
