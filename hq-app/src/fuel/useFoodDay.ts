import { useCallback, useEffect, useState } from 'react';
import { getTargets, listFood } from '../data/food';
import type { FoodEntry, MacroTargets } from '../types';

/** One day's food log plus the macro targets, with a reload for after writes. */
export function useFoodDay(date: string) {
  const [entries, setEntries] = useState<FoodEntry[] | null>(null);
  const [targets, setTargetsState] = useState<MacroTargets | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setError('');
    try {
      const [e, t] = await Promise.all([listFood(date, date), getTargets()]);
      setEntries(e);
      setTargetsState(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [date]);

  useEffect(() => { void reload(); }, [reload]);
  return { entries, targets, error, reload };
}
