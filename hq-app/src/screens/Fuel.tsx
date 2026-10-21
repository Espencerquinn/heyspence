import { useCallback, useEffect, useState } from 'react';
import { Frame } from '../ui/Frame';
import { MacroBars } from '../fuel/MacroBars';
import { BarcodeScanner } from '../fuel/BarcodeScanner';
import { useFoodDay } from '../fuel/useFoodDay';
import {
  addFood, candidateToEntry, deleteFood, estimateMeal, lookupBarcode, recentFoods,
  searchFoods, setTargets, updateFood, type Candidate,
} from '../data/food';
import { macroTotals } from '../system/training';
import { addDays, formatShort, todayISO } from '../system/dates';
import type { FoodEntry, MacroTargets, Meal } from '../types';

const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function mealNow(): Meal {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

const macroLine = (c: { kcal: number; protein_g: number; carbs_g: number; fat_g: number }, s = 1) =>
  `${Math.round(c.kcal * s)} kcal · P ${Math.round(c.protein_g * s)} · C ${Math.round(c.carbs_g * s)} · F ${Math.round(c.fat_g * s)}`;

export function Fuel() {
  const [date, setDate] = useState(todayISO());
  const { entries, targets, error, reload } = useFoodDay(date);
  const today = todayISO();

  return (
    <div className="domain fuel">
      <Frame
        title="Fuel"
        meta={
          <span className="daynav">
            <button type="button" className="linkish" aria-label="Previous day"
                    onClick={() => setDate(addDays(date, -1))}>‹</button>
            <span>{date === today ? 'TODAY' : formatShort(date)}</span>
            <button type="button" className="linkish" aria-label="Next day" disabled={date >= today}
                    onClick={() => setDate(addDays(date, 1))}>›</button>
          </span>
        }
      >
        {error && <p className="inline-error">{error}</p>}
        {entries && targets
          ? <MacroBars totals={macroTotals(entries)} targets={targets} />
          : !error && <p className="quest__empty">Loading…</p>}
      </Frame>

      <AddFood date={date} onAdded={reload} />

      <Frame title="Log" meta={entries ? `${entries.length} ITEMS` : ''}>
        {entries && entries.length === 0 && <p className="quest__empty">Nothing logged for this day.</p>}
        {entries && MEALS.map((meal) => {
          const rows = entries.filter((e) => e.meal === meal);
          if (rows.length === 0) return null;
          return (
            <div className="meal" key={meal}>
              <p className="meal__head">
                {meal.toUpperCase()} <span>{macroLine(macroTotals(rows))}</span>
              </p>
              {rows.map((e) => <EntryRow key={e.id} entry={e} onChange={reload} />)}
            </div>
          );
        })}
      </Frame>

      {targets && <Targets targets={targets} onSaved={reload} />}
    </div>
  );
}

function EntryRow({ entry, onChange }: { entry: FoodEntry; onChange: () => Promise<void> }) {
  const [servings, setServings] = useState(String(entry.servings));
  const [error, setError] = useState('');

  async function saveServings() {
    const n = Number(servings);
    if (!(n > 0) || n === Number(entry.servings)) { setServings(String(entry.servings)); return; }
    try { await updateFood(entry.id, { servings: n }); await onChange(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  async function remove() {
    try { await deleteFood(entry.id); await onChange(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  return (
    <div className="food-row">
      <span className="food-row__body">
        <span className="food-row__name">{entry.name}</span>
        <span className="food-row__meta">{macroLine(entry, Number(entry.servings))}</span>
      </span>
      <label className="food-row__serv">
        <input className="field field--num" type="number" min={0.25} step={0.25} value={servings}
               aria-label={`Servings of ${entry.name}`}
               onChange={(e) => setServings(e.target.value)} onBlur={() => void saveServings()} />
        <small>× {entry.serving_label ?? 'serving'}</small>
      </label>
      <button type="button" className="ghost" aria-label={`Remove ${entry.name}`} onClick={() => void remove()}>×</button>
      {error && <p className="inline-error">{error}</p>}
    </div>
  );
}

type Mode = 'recent' | 'search' | 'scan' | 'describe' | 'manual';

function AddFood({ date, onAdded }: { date: string; onAdded: () => Promise<void> }) {
  const [meal, setMeal] = useState<Meal>(mealNow());
  const [mode, setMode] = useState<Mode>('recent');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [recent, setRecent] = useState<FoodEntry[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (mode === 'recent') recentFoods().then(setRecent).catch(() => setRecent([]));
    setCandidates([]); setError(''); setNote('');
  }, [mode]);

  async function run(fn: () => Promise<Candidate[]>) {
    setBusy(true); setError(''); setNote('');
    try {
      const c = await fn();
      setCandidates(c);
      if (c.length === 0) setNote('No matches.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function add(c: Candidate | FoodEntry, servings: number, repeat = false) {
    setError('');
    try {
      if (repeat) {
        const e = c as FoodEntry;
        await addFood({
          eaten_on: date, meal, servings, name: e.name, serving_label: e.serving_label,
          kcal: e.kcal, protein_g: e.protein_g, carbs_g: e.carbs_g, fat_g: e.fat_g,
          fiber_g: e.fiber_g, source: 'repeat', source_ref: e.source_ref,
        });
      } else {
        await addFood(candidateToEntry(c as Candidate, date, meal, servings));
      }
      setNote(`Added ${c.name}.`);
      await onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const onCode = useCallback((code: string) => {
    void run(() => lookupBarcode(code));
  }, []);

  return (
    <Frame title="Add Food" meta={
      <select className="field field--inline" value={meal} aria-label="Meal"
              onChange={(e) => setMeal(e.target.value as Meal)}>
        {MEALS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
      </select>
    }>
      <div className="tabs" role="tablist">
        {(['recent', 'search', 'scan', 'describe', 'manual'] as Mode[]).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m}
                  className="tab" onClick={() => setMode(m)}>{m}</button>
        ))}
      </div>

      <div className="addfood">
        {mode === 'recent' && (
          recent.length === 0
            ? <p className="quest__empty">Foods you log show up here for one-tap repeats.</p>
            : recent.map((e) => (
                <CandidateRow key={e.id} c={{ ...e, serving_label: e.serving_label ?? 'serving' }}
                              defaultServings={Number(e.servings)}
                              onAdd={(s) => void add(e, s, true)} />
              ))
        )}

        {mode === 'search' && (
          <form className="mini-form" onSubmit={(ev) => { ev.preventDefault(); if (query.trim()) void run(() => searchFoods(query.trim())); }}>
            <input className="field field--grow" placeholder="chicken breast, greek yogurt, Fairlife…"
                   value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="btn btn--sm" disabled={busy || !query.trim()}>Search</button>
          </form>
        )}

        {mode === 'scan' && candidates.length === 0 && <BarcodeScanner onCode={onCode} />}

        {mode === 'describe' && (
          <form className="describe" onSubmit={(ev) => { ev.preventDefault(); if (query.trim()) void run(() => estimateMeal(query.trim())); }}>
            <textarea className="journal__input" rows={3}
                      placeholder="3 scrambled eggs, 2 slices sourdough with butter, black coffee"
                      value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="btn btn--sm" disabled={busy || !query.trim()}>
              {busy ? 'Estimating…' : 'Estimate macros'}
            </button>
            <small className="hint">AI estimate — check portions before adding.</small>
          </form>
        )}

        {mode === 'manual' && <ManualFood onAdd={(c, s) => void add(c, s)} />}

        {busy && mode !== 'describe' && <p className="quest__empty">Looking up…</p>}
        {error && <p className="inline-error">{error}</p>}
        {note && <p className="hint">{note}</p>}
        {mode !== 'recent' && mode !== 'manual' && candidates.map((c, i) => (
          <CandidateRow key={`${c.source_ref ?? c.name}-${i}`} c={c} onAdd={(s) => void add(c, s)} />
        ))}
        {mode === 'scan' && candidates.length > 0 && (
          <button type="button" className="ghost" onClick={() => setCandidates([])}>Scan another</button>
        )}
      </div>
    </Frame>
  );
}

type RowFood = Pick<Candidate, 'name' | 'serving_label' | 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>;

function CandidateRow(props: { c: RowFood; defaultServings?: number; onAdd: (servings: number) => void }) {
  const { c, defaultServings = 1, onAdd } = props;
  const [servings, setServings] = useState(String(defaultServings));
  const s = Number(servings) > 0 ? Number(servings) : 1;
  return (
    <div className="food-row">
      <span className="food-row__body">
        <span className="food-row__name">{c.name}</span>
        <span className="food-row__meta">{c.serving_label} · {macroLine(c, s)}</span>
      </span>
      <label className="food-row__serv">
        <input className="field field--num" type="number" min={0.25} step={0.25} value={servings}
               aria-label={`Servings of ${c.name}`} onChange={(e) => setServings(e.target.value)} />
        <small>×</small>
      </label>
      <button type="button" className="btn btn--sm" onClick={() => onAdd(s)}>Add</button>
    </div>
  );
}

function ManualFood({ onAdd }: { onAdd: (c: Candidate, servings: number) => void }) {
  const blank = { name: '', serving_label: '1 serving', kcal: '', protein_g: '', carbs_g: '', fat_g: '' };
  const [f, setF] = useState(blank);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });
  const ok = f.name.trim() && f.kcal !== '';
  return (
    <form className="manual" onSubmit={(ev) => {
      ev.preventDefault();
      if (!ok) return;
      onAdd({
        name: f.name.trim(), serving_label: f.serving_label || '1 serving',
        kcal: Number(f.kcal) || 0, protein_g: Number(f.protein_g) || 0,
        carbs_g: Number(f.carbs_g) || 0, fat_g: Number(f.fat_g) || 0,
        fiber_g: null, source: 'manual', source_ref: null,
      }, 1);
      setF(blank);
    }}>
      <input className="field field--grow" placeholder="Food" value={f.name} onChange={set('name')} />
      <input className="field" placeholder="Serving" value={f.serving_label} onChange={set('serving_label')} />
      <input className="field field--num" type="number" min={0} placeholder="kcal" value={f.kcal} onChange={set('kcal')} />
      <input className="field field--num" type="number" min={0} placeholder="P g" value={f.protein_g} onChange={set('protein_g')} />
      <input className="field field--num" type="number" min={0} placeholder="C g" value={f.carbs_g} onChange={set('carbs_g')} />
      <input className="field field--num" type="number" min={0} placeholder="F g" value={f.fat_g} onChange={set('fat_g')} />
      <button className="btn btn--sm" disabled={!ok}>Add</button>
    </form>
  );
}

function Targets({ targets, onSaved }: { targets: MacroTargets; onSaved: () => Promise<void> }) {
  const [t, setT] = useState(targets);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const fields: Array<[keyof MacroTargets, string]> = [
    ['kcal', 'kcal'], ['protein_g', 'Protein g'], ['carbs_g', 'Carbs g'], ['fat_g', 'Fat g'], ['fiber_g', 'Fiber g'],
  ];
  return (
    <Frame title="Targets" meta={saved}>
      <form className="manual" onSubmit={async (ev) => {
        ev.preventDefault(); setError('');
        try { await setTargets(t); setSaved('SAVED'); await onSaved(); }
        catch (e) { setError(e instanceof Error ? e.message : String(e)); }
      }}>
        {fields.map(([k, label]) => (
          <label key={k} className="target-field">
            <small>{label}</small>
            <input className="field field--num" type="number" min={0} value={t[k]}
                   onChange={(e) => { setSaved(''); setT({ ...t, [k]: Number(e.target.value) }); }} />
          </label>
        ))}
        <button className="btn btn--sm">Save</button>
      </form>
      {error && <p className="inline-error">{error}</p>}
      <p className="hint hint--pad">
        Visible abs are mostly a body-fat number, not an ab-exercise number. Aim for protein around
        0.7–1 g per lb of goal body weight and a modest deficit (roughly 0.5–1% of body weight lost per week).
        Tirzepatide blunts appetite, so protein is the target to protect.
      </p>
    </Frame>
  );
}
