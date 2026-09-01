# HQ "The System" — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a private, Google-gated, gamified productivity tracker at `heyspence.me/hq` where six life domains render as an RPG stat block and every habit tick feeds an append-only XP ledger.

**Architecture:** A Vite/React SPA in `hq-app/` builds into the committed repo-root `hq/` folder, served by the existing heyspence.me Netlify site via a `/hq/*` rewrite — the same pattern `jobs-app`/`jobs` already uses. Backend is the existing `heyspence` Supabase project with all HQ tables in a dedicated `hq` schema behind single-owner RLS. All game math (levels, ranks, stats, streaks, penalties, titles) lives in `src/system/` as pure, unit-tested functions with no React or Supabase imports, so correctness is provable without a browser.

**Tech Stack:** Vite 8, React 19, TypeScript 6, `@supabase/supabase-js` 2.x, Vitest 3. No router library, no chart library, no state library.

**Spec:** `docs/superpowers/specs/2026-08-31-hq-system-design.md`

## Global Constraints

- **Owner email:** `espencer.quinn@gmail.com` — hardcoded in both the client AuthGate and the DB `hq.is_owner()` function. Never parameterize.
- **Supabase project:** `heyspence`, ref `utvurjzrvnghbmzjrrhq`, URL `https://utvurjzrvnghbmzjrrhq.supabase.co`.
- **Schema:** all tables in `hq`, never `public`. The `hq` schema must be added to **Exposed schemas** in the Supabase dashboard (Project Settings → API) or PostgREST cannot see it. **Never run `supabase config push` from `hq-backend`** — it would overwrite the live auth config that the existing job board depends on.
- **Seven domains, fixed:** `physical`, `intellectual`, `spiritual`, `social`, `musical`, `financial`, `marital` — a Postgres enum, not a text column.
- **Stat keys:** `STR`, `INT`, `WIS`, `CHA`, `SENSE`, `FOR`, `BND` in that display order.
- **Stat colors:** `STR #5ad8ff` · `INT #7f9cff` · `WIS #b28cff` · `CHA #4fe3b0` · `SENSE #ff9ad5` · `FOR #ffc46b` · `BND #ff7a6b`.
- **Penalty panels never tint stat deltas with a stat color** — they render in `--mute`. `BND #ff7a6b` sits near `--penalty #ff4d6a`, and categorical hues must stay separate from the semantic red.
- **Palette:** `--void #04070f` · `--abyss #070d19` · `--system #5ad8ff` · `--ether #dff2ff` · `--mute #6f8ba6` · `--penalty #ff4d6a`.
- **Type:** Chakra Petch (display/UI), JetBrains Mono (all bracketed data). Google Fonts.
- **Level curve:** XP to advance from level *n* is `70n + 20`. Cumulative to reach level *n* is `(n-1)(35n + 20)`.
- **Stat curve:** `statLevel = floor(sqrt(domainXp / 12))`.
- **Rank bands:** E 1–9 · D 10–19 · C 20–34 · B 35–49 · A 50–69 · S 70+.
- **EXP floor invariant:** no penalty may ever reduce the player's level. Penalties clamp at the current level's cumulative threshold.
- **Never return `-0` from the XP math.** `Object.is(-0, 0)` is false, so a negative zero fails a `toBe(0)` assertion and can reach the database as a distinct value. Guard any expression that negates a possibly-zero quantity.
- **Dates are `YYYY-MM-DD` strings** throughout — never `Date` objects in logic, never UTC conversion. All day math goes through `src/system/dates.ts`.
- **Single theme.** Dark only. No `prefers-color-scheme` branches.
- **Vite base:** `/hq/`, `build.outDir: '../hq'`, `emptyOutDir: true`. The `hq/` output is committed.
- **Every task verifies with `npm run build` (`tsc -b`), not only `npm test`.** Vitest runs through esbuild and does NOT type-check, so `noUnusedLocals`/`noUnusedParameters`/type errors pass the suite and fail the build. A green suite is not a green task.

## File Structure

```
hq-backend/supabase/
  config.toml                     project_id=heyspence, api.schemas includes "hq"
  migrations/
    0001_schema.sql               enum + 10 tables
    0002_rls.sql                  hq.is_owner() + policies on every table
    0003_storage.sql              hq-photos private bucket + policies
    0004_seed.sql                 starter habits, one per domain

hq-app/
  index.html                      fonts, manifest link
  vite.config.ts                  base '/hq/', outDir '../hq'
  vitest.config.ts
  package.json  tsconfig*.json
  public/
    manifest.webmanifest
    icon-192.png  icon-512.png  icon-maskable.png
  src/
    main.tsx                      mount
    App.tsx                       AuthGate > SystemProvider > Router > Shell
    router.tsx                    History-API router, 11 routes
    supabaseClient.ts
    types.ts                      Domain/StatKey unions, row types, constants
    system/                       PURE. no react, no supabase imports.
      dates.ts       dates.test.ts
      levels.ts      levels.test.ts
      stats.ts       stats.test.ts
      xp.ts          xp.test.ts
      streaks.ts     streaks.test.ts
      penalties.ts   penalties.test.ts
      titles.ts      titles.test.ts
    data/                         one module per table, all typed
      habits.ts  habitLogs.ts  goals.ts  tasks.ts
      journal.ts  photos.ts  xpEvents.ts  titles.ts  penalties.ts
      snapshot.ts                 one-shot load of everything
    state/
      SystemContext.tsx           snapshot + derived player state + mutations
      useNotifications.tsx        notification queue
    ui/
      tokens.css  system.css      design tokens + shared component CSS
      Frame.tsx  Rail.tsx  Shell.tsx
      NotificationHost.tsx
      PlayerCard.tsx  StatBlock.tsx  ObjectiveRow.tsx  XpBar.tsx
    screens/
      Status.tsx  DomainScreen.tsx  BodyRecord.tsx
    auth/AuthGate.tsx
```

**Boundary rule that matters:** nothing in `src/system/` may import React, Supabase, or `src/data/`. It takes plain data in and returns plain data out. That is what makes Tasks 3–8 testable without a browser or a database, and it is the difference between a tracker you trust and one you don't.

---

### Task 1: Scaffold `hq-app` and the build pipeline

**Files:**
- Create: `hq-app/package.json`, `hq-app/vite.config.ts`, `hq-app/vitest.config.ts`, `hq-app/tsconfig.json`, `hq-app/tsconfig.app.json`, `hq-app/tsconfig.node.json`, `hq-app/index.html`, `hq-app/src/main.tsx`, `hq-app/src/App.tsx`, `hq-app/.gitignore`
- Create: `hq-app/src/system/smoke.test.ts`
- Modify: `netlify.toml` (add `/hq/*` rewrite before the `/*` catch-all)

**Interfaces:**
- Consumes: nothing.
- Produces: a buildable app whose output lands in repo-root `hq/`; `npm test` runs Vitest.

- [ ] **Step 1: Create the package manifest**

`hq-app/package.json`:

```json
{
  "name": "hq-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.108.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6"
  },
  "devDependencies": {
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "typescript": "~6.0.2",
    "vite": "^8.0.12",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Create the Vite and Vitest configs**

`hq-app/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served as a subfolder of heyspence.me at /hq/. Build output is written to the
// repo-root `hq/` dir (committed, like /jobs and /units) and served by the root
// Netlify site.
export default defineConfig({
  base: '/hq/',
  plugins: [react()],
  build: { outDir: '../hq', emptyOutDir: true },
});
```

`hq-app/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
```

- [ ] **Step 3: Create tsconfig files**

`hq-app/tsconfig.json`:

```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
```

`hq-app/tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src"]
}
```

`hq-app/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Create the entry HTML and a placeholder app**

`hq-app/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#04070f" />
    <title>HQ // SYSTEM</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,400;0,500;0,600;0,700;1,500;1,600&family=JetBrains+Mono:wght@400;500;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`hq-app/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`hq-app/src/App.tsx`:

```tsx
export default function App() {
  return <div style={{ color: '#5ad8ff', background: '#04070f', minHeight: '100vh' }}>SYSTEM ONLINE</div>;
}
```

`hq-app/.gitignore`:

```
node_modules
dist
.env.local
```

- [ ] **Step 5: Write a smoke test proving Vitest runs**

`hq-app/src/system/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('vitest harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Install and verify the test harness**

Run: `cd hq-app && npm install && npm test`
Expected: PASS, 1 test.

- [ ] **Step 7: Verify the build lands in the repo-root `hq/`**

Run: `cd hq-app && npm run build && ls ../hq`
Expected: `index.html` and an `assets/` directory exist in the repo-root `hq/`.

- [ ] **Step 8: Add the Netlify rewrite**

In `netlify.toml`, insert this block **immediately before** the `from = "/*"` catch-all redirect:

```toml
# HQ SPA (built into /hq, base '/hq/'). Real files (assets) serve directly;
# deep links fall back to the SPA's index. Must precede the catch-all.
[[redirects]]
  from = "/hq/*"
  to = "/hq/index.html"
  status = 200
```

- [ ] **Step 9: Commit**

```bash
cd "/Users/quinnkb/Desktop/Dev Projects/heyspence.me"
git add hq-app netlify.toml hq
git commit -m "feat(hq): scaffold hq-app SPA, vitest harness, /hq rewrite"
```

---

### Task 2: Domain types and constants

**Files:**
- Create: `hq-app/src/types.ts`
- Test: `hq-app/src/system/types.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Domain`, `StatKey`, `Rank`, `Cadence`, `XpKind`, `Pose` type unions; `DOMAINS`, `STAT_KEYS`, `STAT_OF`, `DOMAIN_OF`, `DOMAIN_COLOR`, `DOMAIN_LABEL` constants; row interfaces `Habit`, `HabitLog`, `Goal`, `Milestone`, `Task`, `JournalEntry`, `ProgressPhoto`, `XpEvent`, `TitleRow`, `Penalty`. Every later task imports from here.

- [ ] **Step 1: Write the failing test**

`hq-app/src/system/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DOMAINS, DOMAIN_OF, STAT_KEYS, STAT_OF, DOMAIN_COLOR, DOMAIN_LABEL } from '../types';

describe('domain constants', () => {
  it('has exactly seven domains in spec order', () => {
    expect(DOMAINS).toEqual([
      'physical', 'intellectual', 'spiritual', 'social', 'musical', 'financial', 'marital',
    ]);
  });

  it('has exactly seven stat keys in display order', () => {
    expect(STAT_KEYS).toEqual(['STR', 'INT', 'WIS', 'CHA', 'SENSE', 'FOR', 'BND']);
  });

  it('maps every domain to a stat and back without loss', () => {
    for (const d of DOMAINS) {
      expect(DOMAIN_OF[STAT_OF[d]]).toBe(d);
    }
    expect(Object.keys(STAT_OF)).toHaveLength(7);
  });

  it('gives every domain a hex color and a label', () => {
    for (const d of DOMAINS) {
      expect(DOMAIN_COLOR[d]).toMatch(/^#[0-9a-f]{6}$/);
      expect(DOMAIN_LABEL[d].length).toBeGreaterThan(0);
    }
  });

  it('uses the locked stat colors', () => {
    expect(DOMAIN_COLOR.physical).toBe('#5ad8ff');
    expect(DOMAIN_COLOR.financial).toBe('#ffc46b');
    expect(DOMAIN_COLOR.musical).toBe('#ff9ad5');
    expect(DOMAIN_COLOR.marital).toBe('#ff7a6b');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hq-app && npx vitest run src/system/types.test.ts`
Expected: FAIL — cannot resolve `../types`.

- [ ] **Step 3: Write the implementation**

`hq-app/src/types.ts`:

```ts
/** The seven life domains. Fixed — matches the `hq.domain` Postgres enum. */
export type Domain =
  | 'physical' | 'intellectual' | 'spiritual' | 'social' | 'musical' | 'financial'
  | 'marital';

/** RPG stat abbreviation shown in the stat block. */
export type StatKey = 'STR' | 'INT' | 'WIS' | 'CHA' | 'SENSE' | 'FOR' | 'BND';

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type Cadence = 'daily' | 'weekdays' | 'n_per_week';
export type XpKind =
  | 'habit' | 'task' | 'journal' | 'milestone' | 'goal' | 'photo'
  | 'quest_bonus' | 'penalty';
export type Pose = 'front' | 'side' | 'back' | 'other';
export type GoalStatus = 'active' | 'done' | 'dropped';
export type TaskStatus = 'open' | 'done' | 'dropped';

export const DOMAINS: readonly Domain[] = [
  'physical', 'intellectual', 'spiritual', 'social', 'musical', 'financial', 'marital',
] as const;

export const STAT_KEYS: readonly StatKey[] = [
  'STR', 'INT', 'WIS', 'CHA', 'SENSE', 'FOR', 'BND',
] as const;

export const STAT_OF: Record<Domain, StatKey> = {
  physical: 'STR',
  intellectual: 'INT',
  spiritual: 'WIS',
  social: 'CHA',
  musical: 'SENSE',
  financial: 'FOR',
  marital: 'BND',
};

export const DOMAIN_OF: Record<StatKey, Domain> = {
  STR: 'physical',
  INT: 'intellectual',
  WIS: 'spiritual',
  CHA: 'social',
  SENSE: 'musical',
  FOR: 'financial',
  BND: 'marital',
};

export const DOMAIN_COLOR: Record<Domain, string> = {
  physical: '#5ad8ff',
  intellectual: '#7f9cff',
  spiritual: '#b28cff',
  social: '#4fe3b0',
  musical: '#ff9ad5',
  financial: '#ffc46b',
  marital: '#ff7a6b',
};

export const DOMAIN_LABEL: Record<Domain, string> = {
  physical: 'Physical',
  intellectual: 'Intellect',
  spiritual: 'Spirit',
  social: 'Social',
  musical: 'Music',
  financial: 'Money',
  marital: 'Marriage',
};

/* ---------- row types (mirror the hq schema exactly) ---------- */

export interface Habit {
  id: string;
  name: string;
  domain: Domain;
  cadence: Cadence;
  weekdays: number[] | null;   // 0=Sun..6=Sat, only for cadence 'weekdays'
  target_per_week: number | null; // only for cadence 'n_per_week'
  target_count: number;        // e.g. 10000 for steps; 1 for a simple check
  xp_value: number;
  sort_order: number;
  archived_at: string | null;
}

export interface HabitLog {
  habit_id: string;
  log_date: string;            // YYYY-MM-DD
  count: number;
}

export interface Goal {
  id: string;
  domain: Domain;
  title: string;
  detail: string | null;
  target_date: string | null;
  status: GoalStatus;
  completed_at: string | null;
}

export interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  sort_order: number;
  done_at: string | null;
}

export interface Task {
  id: string;
  domain: Domain;
  goal_id: string | null;
  title: string;
  notes: string | null;
  due_date: string | null;
  is_focus: boolean;
  status: TaskStatus;
  completed_at: string | null;
}

export interface JournalEntry {
  entry_date: string;
  body: string;
  mood: number | null;         // 1..5
  energy: number | null;       // 1..5
  lesson: string | null;
}

export interface ProgressPhoto {
  id: string;
  taken_on: string;
  pose: Pose;
  storage_path: string;
  weight_lb: number | null;
  bodyfat_pct: number | null;
  note: string | null;
}

export interface XpEvent {
  id: string;
  domain: Domain | null;       // null for whole-player events (quest bonus, penalty)
  amount: number;              // negative for penalties
  kind: XpKind;
  ref_id: string | null;
  occurred_on: string;
}

export interface TitleRow {
  code: string;
  unlocked_at: string;
}

export interface Penalty {
  penalty_date: string;
  missed_habit_ids: string[];
  xp_lost: number;             // stored positive
  streak_before: number;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hq-app && npx vitest run src/system/types.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add hq-app/src/types.ts hq-app/src/system/types.test.ts
git commit -m "feat(hq): domain types, stat mapping, and row interfaces"
```

---

### Task 3: Date utilities

Timezone bugs are the number one source of wrongness in habit trackers — a log written at 11pm local landing on tomorrow's UTC date silently breaks every streak. This module makes all day math operate on `YYYY-MM-DD` strings so that can never happen.

**Files:**
- Create: `hq-app/src/system/dates.ts`
- Test: `hq-app/src/system/dates.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `todayISO(now?: Date): string`, `addDays(iso: string, n: number): string`, `dayOfWeek(iso: string): number`, `weekStart(iso: string): string`, `eachDay(fromISO: string, toISO: string): string[]`, `daysBetween(aISO: string, bISO: string): number`, `formatShort(iso: string): string`.

- [ ] **Step 1: Write the failing test**

`hq-app/src/system/dates.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { addDays, dayOfWeek, daysBetween, eachDay, todayISO, weekStart } from './dates';

describe('todayISO', () => {
  it('uses LOCAL calendar date, not UTC', () => {
    // 2026-08-31 23:30 local. A naive toISOString() would yield 2026-09-01
    // for anyone west of UTC. The local date is what the user ticked.
    const local = new Date(2026, 7, 31, 23, 30, 0);
    expect(todayISO(local)).toBe('2026-08-31');
  });

  it('pads month and day', () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('addDays', () => {
  it('advances within a month', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
  });
  it('goes backwards', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
  it('crosses a year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('is identity for zero', () => {
    expect(addDays('2026-08-31', 0)).toBe('2026-08-31');
  });
});

describe('dayOfWeek', () => {
  it('returns 0 for Sunday and 1 for Monday', () => {
    expect(dayOfWeek('2026-08-30')).toBe(0); // Sunday
    expect(dayOfWeek('2026-08-31')).toBe(1); // Monday
  });
});

describe('weekStart', () => {
  it('returns the Monday of the containing week', () => {
    expect(weekStart('2026-09-02')).toBe('2026-08-31'); // Wed -> Mon
    expect(weekStart('2026-08-31')).toBe('2026-08-31'); // Mon -> itself
  });
  it('treats Sunday as the END of the week, not the start', () => {
    expect(weekStart('2026-09-06')).toBe('2026-08-31'); // Sunday -> prior Monday
  });
});

describe('eachDay', () => {
  it('is inclusive of both ends', () => {
    expect(eachDay('2026-08-30', '2026-09-01'))
      .toEqual(['2026-08-30', '2026-08-31', '2026-09-01']);
  });
  it('returns a single day when from === to', () => {
    expect(eachDay('2026-08-30', '2026-08-30')).toEqual(['2026-08-30']);
  });
  it('returns empty when from is after to', () => {
    expect(eachDay('2026-09-01', '2026-08-30')).toEqual([]);
  });
});

describe('daysBetween', () => {
  it('counts forward days', () => {
    expect(daysBetween('2026-08-30', '2026-09-01')).toBe(2);
  });
  it('is negative going backwards', () => {
    expect(daysBetween('2026-09-01', '2026-08-30')).toBe(-2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hq-app && npx vitest run src/system/dates.test.ts`
Expected: FAIL — cannot resolve `./dates`.

- [ ] **Step 3: Write the implementation**

`hq-app/src/system/dates.ts`:

```ts
/**
 * All HQ day math operates on 'YYYY-MM-DD' strings in the user's LOCAL
 * calendar. Never call toISOString() on a local Date — it shifts the day for
 * anyone west of UTC, which silently corrupts streaks.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Parse 'YYYY-MM-DD' into a local-noon Date, immune to DST edges. */
function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function format(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(now: Date = new Date()): string {
  return format(now);
}

export function addDays(iso: string, n: number): string {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return format(d);
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(iso: string): number {
  return parse(iso).getDay();
}

/** Monday of the week containing `iso`. Weeks run Monday–Sunday. */
export function weekStart(iso: string): string {
  const dow = dayOfWeek(iso);
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(iso, -back);
}

export function daysBetween(aISO: string, bISO: string): number {
  const ms = parse(bISO).getTime() - parse(aISO).getTime();
  return Math.round(ms / 86_400_000);
}

/** Inclusive range. Empty if `fromISO` is after `toISO`. */
export function eachDay(fromISO: string, toISO: string): string[] {
  const span = daysBetween(fromISO, toISO);
  if (span < 0) return [];
  return Array.from({ length: span + 1 }, (_, i) => addDays(fromISO, i));
}

/** 'MON 31 AUG' — for the top bar and timeline headers. */
export function formatShort(iso: string): string {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const mons = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const d = parse(iso);
  return `${days[d.getDay()]} ${d.getDate()} ${mons[d.getMonth()]}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hq-app && npx vitest run src/system/dates.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add hq-app/src/system/dates.ts hq-app/src/system/dates.test.ts
git commit -m "feat(hq): timezone-safe date utilities for day math"
```

---

### Task 4: Levels and ranks

**Files:**
- Create: `hq-app/src/system/levels.ts`
- Test: `hq-app/src/system/levels.test.ts`

**Interfaces:**
- Consumes: `Rank` from `../types`.
- Produces: `cumulativeXpFor(level: number): number`, `xpForNextLevel(level: number): number`, `levelFromXp(totalXp: number): number`, `levelProgress(totalXp: number): { level: number; into: number; need: number; pct: number }`, `rankFromLevel(level: number): Rank`, `nextRankAt(level: number): { rank: Rank; level: number } | null`.

- [ ] **Step 1: Write the failing test**

`hq-app/src/system/levels.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  cumulativeXpFor, levelFromXp, levelProgress, nextRankAt, rankFromLevel, xpForNextLevel,
} from './levels';

describe('xpForNextLevel', () => {
  it('follows 70n + 20', () => {
    expect(xpForNextLevel(1)).toBe(90);
    expect(xpForNextLevel(14)).toBe(1000);
    expect(xpForNextLevel(50)).toBe(3520);
  });
});

describe('cumulativeXpFor', () => {
  it('is zero at level 1', () => {
    expect(cumulativeXpFor(1)).toBe(0);
  });
  it('matches the closed form (n-1)(35n+20)', () => {
    expect(cumulativeXpFor(14)).toBe(6630);
    expect(cumulativeXpFor(50)).toBe(86730);
  });
  it('is the running sum of xpForNextLevel', () => {
    let sum = 0;
    for (let n = 1; n < 40; n++) {
      expect(cumulativeXpFor(n)).toBe(sum);
      sum += xpForNextLevel(n);
    }
  });
});

describe('levelFromXp', () => {
  it('starts at level 1 with no xp', () => {
    expect(levelFromXp(0)).toBe(1);
  });

  // The invariant that matters: the closed-form inverse must agree with the
  // curve at EVERY boundary, not just the ones we eyeballed.
  it('round-trips exactly at every level boundary from 1 to 120', () => {
    for (let n = 1; n <= 120; n++) {
      const at = cumulativeXpFor(n);
      expect(levelFromXp(at)).toBe(n);
      if (n > 1) expect(levelFromXp(at - 1)).toBe(n - 1);
    }
  });

  it('never returns below 1 for negative input', () => {
    expect(levelFromXp(-500)).toBe(1);
  });
});

describe('levelProgress', () => {
  it('reports progress into the current level', () => {
    const p = levelProgress(cumulativeXpFor(14) + 640);
    expect(p.level).toBe(14);
    expect(p.into).toBe(640);
    expect(p.need).toBe(1000);
    expect(p.pct).toBeCloseTo(64, 5);
  });
  it('is at zero percent exactly on a level boundary', () => {
    const p = levelProgress(cumulativeXpFor(9));
    expect(p.level).toBe(9);
    expect(p.into).toBe(0);
    expect(p.pct).toBe(0);
  });
});

describe('rankFromLevel', () => {
  it('uses the locked bands', () => {
    expect(rankFromLevel(1)).toBe('E');
    expect(rankFromLevel(9)).toBe('E');
    expect(rankFromLevel(10)).toBe('D');
    expect(rankFromLevel(14)).toBe('D');
    expect(rankFromLevel(20)).toBe('C');
    expect(rankFromLevel(35)).toBe('B');
    expect(rankFromLevel(50)).toBe('A');
    expect(rankFromLevel(70)).toBe('S');
    expect(rankFromLevel(999)).toBe('S');
  });
});

describe('nextRankAt', () => {
  it('names the next promotion', () => {
    expect(nextRankAt(14)).toEqual({ rank: 'C', level: 20 });
  });
  it('returns null at S rank', () => {
    expect(nextRankAt(70)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hq-app && npx vitest run src/system/levels.test.ts`
Expected: FAIL — cannot resolve `./levels`.

- [ ] **Step 3: Write the implementation**

`hq-app/src/system/levels.ts`:

```ts
import type { Rank } from '../types';

/** EXP required to advance FROM `level` to `level + 1`. */
export function xpForNextLevel(level: number): number {
  return 70 * level + 20;
}

/**
 * Total EXP required to have reached `level`.
 * Sum of (70k + 20) for k = 1..level-1  =>  (level-1)(35·level + 20).
 */
export function cumulativeXpFor(level: number): number {
  return (level - 1) * (35 * level + 20);
}

/**
 * Inverse of cumulativeXpFor. Solving 35n² - 15n - 20 - total = 0 gives
 *   n = (15 + sqrt(225 + 140(total + 20))) / 70
 * Verified to round-trip exactly at every boundary for levels 1..120.
 */
export function levelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  const n = (15 + Math.sqrt(225 + 140 * (totalXp + 20))) / 70;
  return Math.max(1, Math.floor(n));
}

export function levelProgress(totalXp: number): {
  level: number; into: number; need: number; pct: number;
} {
  const level = levelFromXp(totalXp);
  const into = Math.max(0, totalXp) - cumulativeXpFor(level);
  const need = xpForNextLevel(level);
  return { level, into, need, pct: (into / need) * 100 };
}

const RANK_BANDS: ReadonlyArray<{ rank: Rank; from: number }> = [
  { rank: 'S', from: 70 },
  { rank: 'A', from: 50 },
  { rank: 'B', from: 35 },
  { rank: 'C', from: 20 },
  { rank: 'D', from: 10 },
  { rank: 'E', from: 1 },
];

export function rankFromLevel(level: number): Rank {
  return RANK_BANDS.find((b) => level >= b.from)?.rank ?? 'E';
}

export function nextRankAt(level: number): { rank: Rank; level: number } | null {
  const higher = [...RANK_BANDS].reverse().find((b) => b.from > level);
  return higher ? { rank: higher.rank, level: higher.from } : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hq-app && npx vitest run src/system/levels.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add hq-app/src/system/levels.ts hq-app/src/system/levels.test.ts
git commit -m "feat(hq): level curve, closed-form inverse, and rank bands"
```

---

### Task 5: Stat curve, XP values, and the penalty floor

The EXP floor is the mechanical expression of "penalties sting, they don't punish." It is an invariant, not a preference: no sequence of penalties may ever cost the player a level.

**Files:**
- Create: `hq-app/src/system/stats.ts`, `hq-app/src/system/xp.ts`
- Test: `hq-app/src/system/stats.test.ts`, `hq-app/src/system/xp.test.ts`

**Interfaces:**
- Consumes: `levelFromXp`, `cumulativeXpFor` from `./levels`; `Domain`, `StatKey` from `../types`.
- Produces:
  - `stats.ts` — `statXpFor(statLevel: number): number`, `statLevelFromXp(domainXp: number): number`, `statProgress(domainXp: number): { level: number; into: number; need: number; pct: number }`
  - `xp.ts` — `XP` constant object, `clampPenalty(totalXp: number, requested: number): number`, `domainTotals(events: Pick<XpEvent,'domain'|'amount'>[]): Record<Domain, number>`, `playerTotal(events: Pick<XpEvent,'amount'>[]): number`

- [ ] **Step 1: Write the failing tests**

`hq-app/src/system/stats.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { statLevelFromXp, statProgress, statXpFor } from './stats';

describe('statXpFor', () => {
  it('follows 12·n²', () => {
    expect(statXpFor(1)).toBe(12);
    expect(statXpFor(10)).toBe(1200);
    expect(statXpFor(22)).toBe(5808);
  });
});

describe('statLevelFromXp', () => {
  it('is zero before the first threshold', () => {
    expect(statLevelFromXp(0)).toBe(0);
    expect(statLevelFromXp(11)).toBe(0);
  });
  it('crosses exactly at the threshold', () => {
    expect(statLevelFromXp(5807)).toBe(21);
    expect(statLevelFromXp(5808)).toBe(22);
  });
  it('round-trips at every stat level from 1 to 60', () => {
    for (let n = 1; n <= 60; n++) {
      expect(statLevelFromXp(statXpFor(n))).toBe(n);
      expect(statLevelFromXp(statXpFor(n) - 1)).toBe(n - 1);
    }
  });
  it('never goes negative', () => {
    expect(statLevelFromXp(-100)).toBe(0);
  });
});

describe('statProgress', () => {
  it('reports progress toward the next stat level', () => {
    const p = statProgress(statXpFor(10) + 100);
    expect(p.level).toBe(10);
    expect(p.into).toBe(100);
    expect(p.need).toBe(statXpFor(11) - statXpFor(10));
    expect(p.pct).toBeGreaterThan(0);
    expect(p.pct).toBeLessThan(100);
  });
});
```

`hq-app/src/system/xp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { XP, clampPenalty, domainTotals, playerTotal } from './xp';
import { cumulativeXpFor, levelFromXp } from './levels';

describe('XP values', () => {
  it('matches the spec', () => {
    expect(XP.habitDefault).toBe(25);
    expect(XP.task).toBe(15);
    expect(XP.focusTask).toBe(25);
    expect(XP.journal).toBe(20);
    expect(XP.milestone).toBe(150);
    expect(XP.goal).toBe(500);
    expect(XP.photo).toBe(30);
    expect(XP.questBonus).toBe(100);
    expect(XP.penalty).toBe(40);
  });
});

describe('clampPenalty', () => {
  it('applies the full penalty when there is room in the level', () => {
    const total = cumulativeXpFor(14) + 640;
    expect(clampPenalty(total, 40)).toBe(-40);
  });

  it('clamps to the level floor rather than dropping a level', () => {
    const total = cumulativeXpFor(14) + 10; // only 10 xp above the floor
    expect(clampPenalty(total, 40)).toBe(-10);
  });

  it('applies nothing when sitting exactly on a level boundary', () => {
    expect(clampPenalty(cumulativeXpFor(14), 40)).toBe(0);
  });

  it('applies nothing at level 1 with zero xp', () => {
    expect(clampPenalty(0, 40)).toBe(0);
  });

  // THE INVARIANT. No run of penalties may ever cost a level.
  it('never reduces the player level, over 500 consecutive penalties', () => {
    let total = cumulativeXpFor(14) + 640;
    const startLevel = levelFromXp(total);
    for (let i = 0; i < 500; i++) {
      total += clampPenalty(total, XP.penalty);
      expect(levelFromXp(total)).toBe(startLevel);
    }
  });
});

describe('playerTotal', () => {
  it('sums signed amounts', () => {
    expect(playerTotal([{ amount: 40 }, { amount: 25 }, { amount: -40 }])).toBe(25);
  });
  it('is zero for no events', () => {
    expect(playerTotal([])).toBe(0);
  });
});

describe('domainTotals', () => {
  it('buckets by domain and ignores null-domain events', () => {
    const t = domainTotals([
      { domain: 'physical', amount: 40 },
      { domain: 'physical', amount: 30 },
      { domain: 'musical', amount: 35 },
      { domain: null, amount: 100 },   // quest bonus — not attributable
    ]);
    expect(t.physical).toBe(70);
    expect(t.musical).toBe(35);
    expect(t.financial).toBe(0);
  });

  it('returns a key for all seven domains even with no events', () => {
    const t = domainTotals([]);
    expect(Object.keys(t).sort()).toEqual(
      ['financial', 'intellectual', 'marital', 'musical', 'physical', 'social', 'spiritual'],
    );
  });

  it('clamps a domain total at zero so a stat cannot go negative', () => {
    const t = domainTotals([{ domain: 'social', amount: -80 }]);
    expect(t.social).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd hq-app && npx vitest run src/system/stats.test.ts src/system/xp.test.ts`
Expected: FAIL — cannot resolve `./stats` and `./xp`.

- [ ] **Step 3: Write the implementations**

`hq-app/src/system/stats.ts`:

```ts
/**
 * Each domain levels off its own EXP pool on a decelerating curve:
 *   statLevel = floor(sqrt(domainXp / 12))   <=>   xp(n) = 12n²
 * ≈80 days of daily effort in one domain reaches stat level 20.
 */

export function statXpFor(statLevel: number): number {
  return 12 * statLevel * statLevel;
}

export function statLevelFromXp(domainXp: number): number {
  if (domainXp <= 0) return 0;
  return Math.floor(Math.sqrt(domainXp / 12));
}

export function statProgress(domainXp: number): {
  level: number; into: number; need: number; pct: number;
} {
  const level = statLevelFromXp(domainXp);
  const base = statXpFor(level);
  const need = statXpFor(level + 1) - base;
  const into = Math.max(0, domainXp) - base;
  return { level, into, need, pct: (into / need) * 100 };
}
```

`hq-app/src/system/xp.ts`:

```ts
import { DOMAINS, type Domain } from '../types';
import { cumulativeXpFor, levelFromXp } from './levels';

/** EXP awarded per action. `penalty` is stored POSITIVE; clampPenalty negates. */
export const XP = {
  habitDefault: 25,
  task: 15,
  focusTask: 25,
  journal: 20,
  milestone: 150,
  goal: 500,
  photo: 30,
  questBonus: 100,
  penalty: 40,
} as const;

/**
 * Returns the (negative, or zero) amount to actually apply for a penalty of
 * `requested` magnitude, clamped so the player NEVER loses a level.
 * This is a hard invariant of the design, not a nicety.
 */
export function clampPenalty(totalXp: number, requested: number): number {
  const floor = cumulativeXpFor(levelFromXp(totalXp));
  const room = Math.max(0, totalXp - floor);
  const deducted = Math.min(Math.abs(requested), room);
  // Return a literal 0, never -0. Object.is(-0, 0) is false, so a -0 here
  // fails the `toBe(0)` boundary assertion and can propagate a negative zero
  // into the xp_lost column downstream.
  return deducted > 0 ? -deducted : 0;
}

export function playerTotal(events: ReadonlyArray<{ amount: number }>): number {
  return events.reduce((sum, e) => sum + e.amount, 0);
}

/** Per-domain EXP pools, floored at zero so a stat can never read negative. */
export function domainTotals(
  events: ReadonlyArray<{ domain: Domain | null; amount: number }>,
): Record<Domain, number> {
  const totals = Object.fromEntries(DOMAINS.map((d) => [d, 0])) as Record<Domain, number>;
  for (const e of events) {
    if (e.domain) totals[e.domain] += e.amount;
  }
  for (const d of DOMAINS) totals[d] = Math.max(0, totals[d]);
  return totals;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd hq-app && npx vitest run src/system/stats.test.ts src/system/xp.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add hq-app/src/system/stats.ts hq-app/src/system/stats.test.ts \
        hq-app/src/system/xp.ts hq-app/src/system/xp.test.ts
git commit -m "feat(hq): stat curve, XP values, and the no-delevel penalty floor"
```

---

### Task 6: Habit cadence and streaks

**Files:**
- Create: `hq-app/src/system/streaks.ts`
- Test: `hq-app/src/system/streaks.test.ts`

**Interfaces:**
- Consumes: `addDays`, `dayOfWeek`, `eachDay`, `weekStart` from `./dates`; `Habit`, `HabitLog` from `../types`.
- Produces: `logKey(habitId: string, date: string): string`, `buildLogIndex(logs: HabitLog[]): Map<string, number>`, `isDueOn(habit: Habit, date: string, index: Map<string, number>): boolean`, `isMetOn(habit: Habit, date: string, index: Map<string, number>): boolean`, `streakFor(habit: Habit, index: Map<string, number>, today: string): number`, `dueHabitsOn(habits: Habit[], date: string, index: Map<string, number>): Habit[]`.

- [ ] **Step 1: Write the failing test**

`hq-app/src/system/streaks.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildLogIndex, dueHabitsOn, isDueOn, isMetOn, logKey, streakFor,
} from './streaks';
import type { Habit, HabitLog } from '../types';

const base: Omit<Habit, 'id' | 'cadence' | 'weekdays' | 'target_per_week'> = {
  name: 'Test',
  domain: 'physical',
  target_count: 1,
  xp_value: 25,
  sort_order: 0,
  archived_at: null,
};

const daily = (id = 'h1'): Habit =>
  ({ ...base, id, cadence: 'daily', weekdays: null, target_per_week: null });

const onWeekdays = (weekdays: number[], id = 'h2'): Habit =>
  ({ ...base, id, cadence: 'weekdays', weekdays, target_per_week: null });

const nPerWeek = (n: number, id = 'h3'): Habit =>
  ({ ...base, id, cadence: 'n_per_week', weekdays: null, target_per_week: n });

const logs = (...pairs: Array<[string, string, number?]>): HabitLog[] =>
  pairs.map(([habit_id, log_date, count]) => ({ habit_id, log_date, count: count ?? 1 }));

describe('logKey / buildLogIndex', () => {
  it('indexes counts by habit and date', () => {
    const idx = buildLogIndex(logs(['h1', '2026-08-31', 3]));
    expect(idx.get(logKey('h1', '2026-08-31'))).toBe(3);
    expect(idx.get(logKey('h1', '2026-08-30'))).toBeUndefined();
  });
});

describe('isDueOn — daily', () => {
  it('is due every day', () => {
    const idx = buildLogIndex([]);
    expect(isDueOn(daily(), '2026-08-31', idx)).toBe(true);
    expect(isDueOn(daily(), '2026-09-06', idx)).toBe(true);
  });
});

describe('isDueOn — weekdays', () => {
  it('is due only on the listed weekdays', () => {
    const idx = buildLogIndex([]);
    const h = onWeekdays([1, 3, 5]); // Mon/Wed/Fri
    expect(isDueOn(h, '2026-08-31', idx)).toBe(true);  // Monday
    expect(isDueOn(h, '2026-09-01', idx)).toBe(false); // Tuesday
    expect(isDueOn(h, '2026-09-02', idx)).toBe(true);  // Wednesday
  });
});

describe('isDueOn — n_per_week', () => {
  it('is due while the week target is unmet', () => {
    const idx = buildLogIndex([]);
    expect(isDueOn(nPerWeek(3), '2026-09-02', idx)).toBe(true);
  });

  it('stops being due once the week target is met', () => {
    // week of Mon 2026-08-31
    const idx = buildLogIndex(logs(
      ['h3', '2026-08-31'], ['h3', '2026-09-01'], ['h3', '2026-09-02'],
    ));
    expect(isDueOn(nPerWeek(3), '2026-09-03', idx)).toBe(false);
  });

  it('stays due on a day it was itself logged, so the tick stays visible', () => {
    const idx = buildLogIndex(logs(
      ['h3', '2026-08-31'], ['h3', '2026-09-01'], ['h3', '2026-09-02'],
    ));
    expect(isDueOn(nPerWeek(3), '2026-09-02', idx)).toBe(true);
  });

  it('resets with the new week', () => {
    const idx = buildLogIndex(logs(
      ['h3', '2026-08-31'], ['h3', '2026-09-01'], ['h3', '2026-09-02'],
    ));
    expect(isDueOn(nPerWeek(3), '2026-09-07', idx)).toBe(true); // next Monday
  });
});

describe('isMetOn', () => {
  it('requires reaching target_count, not merely being logged', () => {
    const steps: Habit = { ...daily('steps'), target_count: 10000 };
    const idx = buildLogIndex(logs(['steps', '2026-08-31', 6420]));
    expect(isMetOn(steps, '2026-08-31', idx)).toBe(false);

    const idx2 = buildLogIndex(logs(['steps', '2026-08-31', 10000]));
    expect(isMetOn(steps, '2026-08-31', idx2)).toBe(true);
  });
});

describe('streakFor', () => {
  it('is zero with no logs', () => {
    expect(streakFor(daily(), buildLogIndex([]), '2026-08-31')).toBe(0);
  });

  it('counts consecutive met days ending today', () => {
    const idx = buildLogIndex(logs(
      ['h1', '2026-08-29'], ['h1', '2026-08-30'], ['h1', '2026-08-31'],
    ));
    expect(streakFor(daily(), idx, '2026-08-31')).toBe(3);
  });

  it('does NOT break when today is simply not done yet', () => {
    // Today is still in progress — an unticked today must not zero the streak.
    const idx = buildLogIndex(logs(['h1', '2026-08-29'], ['h1', '2026-08-30']));
    expect(streakFor(daily(), idx, '2026-08-31')).toBe(2);
  });

  it('breaks on a missed day before today', () => {
    const idx = buildLogIndex(logs(
      ['h1', '2026-08-28'], ['h1', '2026-08-29'], ['h1', '2026-08-31'],
    ));
    expect(streakFor(daily(), idx, '2026-08-31')).toBe(1);
  });

  it('skips days the habit was not due', () => {
    const h = onWeekdays([1, 3, 5], 'mwf');
    // Mon 8/31, Wed 9/2, Fri 9/4 all met; Tue/Thu never due.
    const idx = buildLogIndex(logs(
      ['mwf', '2026-08-31'], ['mwf', '2026-09-02'], ['mwf', '2026-09-04'],
    ));
    expect(streakFor(h, idx, '2026-09-04')).toBe(3);
  });

  it('stops after 400 days rather than scanning forever', () => {
    const dates: Array<[string, string]> = [];
    let d = '2026-08-31';
    for (let i = 0; i < 500; i++) { dates.push(['h1', d]); d = addDaysLocal(d, -1); }
    const idx = buildLogIndex(logs(...dates));
    expect(streakFor(daily(), idx, '2026-08-31')).toBe(400);
  });
});

describe('dueHabitsOn', () => {
  it('filters to due, non-archived habits in sort order', () => {
    const idx = buildLogIndex([]);
    const a: Habit = { ...daily('a'), sort_order: 2 };
    const b: Habit = { ...daily('b'), sort_order: 1 };
    const gone: Habit = { ...daily('c'), archived_at: '2026-01-01' };
    const tue: Habit = { ...onWeekdays([2], 'd') };
    const out = dueHabitsOn([a, b, gone, tue], '2026-08-31', idx); // Monday
    expect(out.map((h) => h.id)).toEqual(['b', 'a']);
  });
});

// local helper so the test file does not depend on import order
function addDaysLocal(iso: string, n: number): string {
  const [y, m, dd] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, dd, 12);
  dt.setDate(dt.getDate() + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hq-app && npx vitest run src/system/streaks.test.ts`
Expected: FAIL — cannot resolve `./streaks`.

- [ ] **Step 3: Write the implementation**

`hq-app/src/system/streaks.ts`:

```ts
import type { Habit, HabitLog } from '../types';
import { addDays, dayOfWeek, eachDay, weekStart } from './dates';

/** Longest streak we will ever scan backwards. Keeps a corrupt index bounded. */
const MAX_SCAN = 400;

export function logKey(habitId: string, date: string): string {
  return `${habitId}:${date}`;
}

export function buildLogIndex(logs: ReadonlyArray<HabitLog>): Map<string, number> {
  const idx = new Map<string, number>();
  for (const l of logs) idx.set(logKey(l.habit_id, l.log_date), l.count);
  return idx;
}

/**
 * Is this habit expected today?
 *  - daily      → always
 *  - weekdays   → only on the listed days of the week
 *  - n_per_week → while the Mon–Sun target is unmet, OR on a day already
 *                 logged (so ticking it does not make the row vanish)
 */
export function isDueOn(habit: Habit, date: string, index: Map<string, number>): boolean {
  if (habit.archived_at) return false;
  switch (habit.cadence) {
    case 'daily':
      return true;
    case 'weekdays':
      return (habit.weekdays ?? []).includes(dayOfWeek(date));
    case 'n_per_week': {
      if ((index.get(logKey(habit.id, date)) ?? 0) > 0) return true;
      const target = habit.target_per_week ?? 0;
      // count days BEFORE today in this week, so today still shows as due
      const before = eachDay(weekStart(date), date)
        .filter((d) => d !== date)
        .filter((d) => (index.get(logKey(habit.id, d)) ?? 0) >= habit.target_count)
        .length;
      return before < target;
    }
  }
}

/** Did the habit actually hit its target on this date? */
export function isMetOn(habit: Habit, date: string, index: Map<string, number>): boolean {
  return (index.get(logKey(habit.id, date)) ?? 0) >= habit.target_count;
}

/**
 * Consecutive met days ending at (or the day before) `today`.
 * An unticked TODAY does not break the streak — the day is still in progress.
 * Days the habit was not due are skipped, not counted and not breaking.
 */
export function streakFor(habit: Habit, index: Map<string, number>, today: string): number {
  let streak = 0;
  let cursor = today;
  for (let i = 0; i < MAX_SCAN; i++) {
    const due = isDueOn(habit, cursor, index);
    const met = isMetOn(habit, cursor, index);
    if (met) streak += 1;
    else if (due && cursor !== today) break;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function dueHabitsOn(
  habits: ReadonlyArray<Habit>, date: string, index: Map<string, number>,
): Habit[] {
  return habits
    .filter((h) => !h.archived_at && isDueOn(h, date, index))
    .sort((a, b) => a.sort_order - b.sort_order);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hq-app && npx vitest run src/system/streaks.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add hq-app/src/system/streaks.ts hq-app/src/system/streaks.test.ts
git commit -m "feat(hq): habit cadence rules and streak computation"
```

---

### Task 7: Penalty evaluation

**Files:**
- Create: `hq-app/src/system/penalties.ts`
- Test: `hq-app/src/system/penalties.test.ts`

**Interfaces:**
- Consumes: `eachDay` from `./dates`; `dueHabitsOn`, `isMetOn` from `./streaks`; `Habit` from `../types`.
- Produces: `evaluatePenalties(input: PenaltyInput): PenaltyOutcome[]` and the exported interfaces `PenaltyInput { fromDate: string; throughDate: string; habits: Habit[]; index: Map<string, number>; alreadyPenalized: ReadonlySet<string> }` and `PenaltyOutcome { date: string; missedHabitIds: string[] }`.

- [ ] **Step 1: Write the failing test**

`hq-app/src/system/penalties.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { evaluatePenalties } from './penalties';
import { buildLogIndex } from './streaks';
import type { Habit, HabitLog } from '../types';

const habit = (id: string, over: Partial<Habit> = {}): Habit => ({
  id, name: id, domain: 'physical', cadence: 'daily', weekdays: null,
  target_per_week: null, target_count: 1, xp_value: 25, sort_order: 0,
  archived_at: null, ...over,
});

const logs = (...pairs: Array<[string, string]>): HabitLog[] =>
  pairs.map(([habit_id, log_date]) => ({ habit_id, log_date, count: 1 }));

describe('evaluatePenalties', () => {
  it('flags a day where a due habit went unlogged', () => {
    const out = evaluatePenalties({
      fromDate: '2026-08-30', throughDate: '2026-08-30',
      habits: [habit('a')], index: buildLogIndex([]),
      alreadyPenalized: new Set(),
    });
    expect(out).toEqual([{ date: '2026-08-30', missedHabitIds: ['a'] }]);
  });

  it('does not flag a fully cleared day', () => {
    const out = evaluatePenalties({
      fromDate: '2026-08-30', throughDate: '2026-08-30',
      habits: [habit('a')], index: buildLogIndex(logs(['a', '2026-08-30'])),
      alreadyPenalized: new Set(),
    });
    expect(out).toEqual([]);
  });

  it('flags a partially cleared day and lists only what was missed', () => {
    const out = evaluatePenalties({
      fromDate: '2026-08-30', throughDate: '2026-08-30',
      habits: [habit('a'), habit('b')],
      index: buildLogIndex(logs(['a', '2026-08-30'])),
      alreadyPenalized: new Set(),
    });
    expect(out).toEqual([{ date: '2026-08-30', missedHabitIds: ['b'] }]);
  });

  it('does not flag a day with no due habits at all', () => {
    const tuesdayOnly = habit('t', { cadence: 'weekdays', weekdays: [2] });
    const out = evaluatePenalties({
      fromDate: '2026-08-31', throughDate: '2026-08-31', // a Monday
      habits: [tuesdayOnly], index: buildLogIndex([]),
      alreadyPenalized: new Set(),
    });
    expect(out).toEqual([]);
  });

  it('skips dates already penalized, so evaluation is idempotent', () => {
    const args = {
      fromDate: '2026-08-29', throughDate: '2026-08-30',
      habits: [habit('a')], index: buildLogIndex([]),
    };
    const first = evaluatePenalties({ ...args, alreadyPenalized: new Set() });
    expect(first.map((p) => p.date)).toEqual(['2026-08-29', '2026-08-30']);

    const second = evaluatePenalties({
      ...args, alreadyPenalized: new Set(first.map((p) => p.date)),
    });
    expect(second).toEqual([]);
  });

  it('evaluates a multi-day gap in order', () => {
    const out = evaluatePenalties({
      fromDate: '2026-08-28', throughDate: '2026-08-30',
      habits: [habit('a')],
      index: buildLogIndex(logs(['a', '2026-08-29'])),
      alreadyPenalized: new Set(),
    });
    expect(out.map((p) => p.date)).toEqual(['2026-08-28', '2026-08-30']);
  });

  it('returns nothing when the range is empty (nothing to catch up on)', () => {
    const out = evaluatePenalties({
      fromDate: '2026-08-31', throughDate: '2026-08-30', // from > through
      habits: [habit('a')], index: buildLogIndex([]),
      alreadyPenalized: new Set(),
    });
    expect(out).toEqual([]);
  });

  it('ignores archived habits', () => {
    const out = evaluatePenalties({
      fromDate: '2026-08-30', throughDate: '2026-08-30',
      habits: [habit('a', { archived_at: '2026-01-01' })],
      index: buildLogIndex([]), alreadyPenalized: new Set(),
    });
    expect(out).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hq-app && npx vitest run src/system/penalties.test.ts`
Expected: FAIL — cannot resolve `./penalties`.

- [ ] **Step 3: Write the implementation**

`hq-app/src/system/penalties.ts`:

```ts
import type { Habit } from '../types';
import { eachDay } from './dates';
import { dueHabitsOn, isMetOn } from './streaks';

export interface PenaltyInput {
  /** First day to evaluate (inclusive). */
  fromDate: string;
  /** Last day to evaluate (inclusive). Always YESTERDAY — today is still live. */
  throughDate: string;
  habits: ReadonlyArray<Habit>;
  index: Map<string, number>;
  /** Dates that already have a penalty row, so re-evaluation is idempotent. */
  alreadyPenalized: ReadonlySet<string>;
}

export interface PenaltyOutcome {
  date: string;
  missedHabitIds: string[];
}

/**
 * A day earns a penalty when it had at least one due habit and any of them
 * went unmet. Days with nothing due are free. Already-penalized days are
 * skipped so this can run on every app load without stacking penalties.
 */
export function evaluatePenalties(input: PenaltyInput): PenaltyOutcome[] {
  const { fromDate, throughDate, habits, index, alreadyPenalized } = input;
  const out: PenaltyOutcome[] = [];

  for (const date of eachDay(fromDate, throughDate)) {
    if (alreadyPenalized.has(date)) continue;
    const due = dueHabitsOn(habits, date, index);
    if (due.length === 0) continue;
    const missed = due.filter((h) => !isMetOn(h, date, index)).map((h) => h.id);
    if (missed.length > 0) out.push({ date, missedHabitIds: missed });
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hq-app && npx vitest run src/system/penalties.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add hq-app/src/system/penalties.ts hq-app/src/system/penalties.test.ts
git commit -m "feat(hq): idempotent daily-quest penalty evaluation"
```

---

### Task 8: Titles

**Deviation from the spec, deliberate:** the spec phrases several titles against a named habit ("100 gym logs"). Habits are user-editable, so a rename would silently break the title. Titles are therefore defined against **domain log counts**, which survives renames. Same intent, robust mechanism.

**Files:**
- Create: `hq-app/src/system/titles.ts`
- Test: `hq-app/src/system/titles.test.ts`

**Interfaces:**
- Consumes: `Domain`, `StatKey` from `../types`.
- Produces: `TitleContext`, `TitleDef`, `TITLE_DEFS: readonly TitleDef[]`, `evaluateTitles(ctx: TitleContext, unlocked: ReadonlySet<string>): TitleDef[]`, `emptyTitleContext(): TitleContext`.

- [ ] **Step 1: Write the failing test**

`hq-app/src/system/titles.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TITLE_DEFS, emptyTitleContext, evaluateTitles } from './titles';

describe('TITLE_DEFS', () => {
  it('has unique codes', () => {
    const codes = TITLE_DEFS.map((t) => t.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
  it('gives every title a name and a detail line', () => {
    for (const t of TITLE_DEFS) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.detail.length).toBeGreaterThan(0);
    }
  });
});

describe('evaluateTitles', () => {
  it('unlocks nothing on an empty context', () => {
    expect(evaluateTitles(emptyTitleContext(), new Set())).toEqual([]);
  });

  it('unlocks The Awakened at a 7-day streak', () => {
    const ctx = { ...emptyTitleContext(), longestStreak: 7 };
    expect(evaluateTitles(ctx, new Set()).map((t) => t.code)).toContain('awakened');
  });

  it('does not unlock The Awakened at 6 days', () => {
    const ctx = { ...emptyTitleContext(), longestStreak: 6 };
    expect(evaluateTitles(ctx, new Set()).map((t) => t.code)).not.toContain('awakened');
  });

  it('never re-reports an already-unlocked title', () => {
    const ctx = { ...emptyTitleContext(), longestStreak: 30 };
    const fresh = evaluateTitles(ctx, new Set());
    expect(fresh.length).toBeGreaterThan(0);
    const codes = new Set(fresh.map((t) => t.code));
    expect(evaluateTitles(ctx, codes)).toEqual([]);
  });

  it('unlocks Balanced only when ALL seven stats reach 10', () => {
    const six = {
      ...emptyTitleContext(),
      statLevels: { STR: 10, INT: 10, WIS: 10, CHA: 10, SENSE: 10, FOR: 10, BND: 9 },
    };
    expect(evaluateTitles(six, new Set()).map((t) => t.code)).not.toContain('balanced');

    const seven = { ...six, statLevels: { ...six.statLevels, BND: 10 } };
    expect(evaluateTitles(seven, new Set()).map((t) => t.code)).toContain('balanced');
  });

  it('unlocks Two as One at 60 marital logs', () => {
    const ctx = emptyTitleContext();
    ctx.domainLogCounts.marital = 60;
    expect(evaluateTitles(ctx, new Set()).map((t) => t.code)).toContain('two_as_one');
  });

  it('unlocks Monarch of Iron at 100 physical logs', () => {
    const ctx = emptyTitleContext();
    ctx.domainLogCounts.physical = 100;
    expect(evaluateTitles(ctx, new Set()).map((t) => t.code)).toContain('monarch_of_iron');
  });

  it('unlocks Chronicler at 100 journal entries', () => {
    const ctx = { ...emptyTitleContext(), journalCount: 100 };
    expect(evaluateTitles(ctx, new Set()).map((t) => t.code)).toContain('chronicler');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hq-app && npx vitest run src/system/titles.test.ts`
Expected: FAIL — cannot resolve `./titles`.

- [ ] **Step 3: Write the implementation**

`hq-app/src/system/titles.ts`:

```ts
import { DOMAINS, STAT_KEYS, type Domain, type StatKey } from '../types';

export interface TitleContext {
  currentStreak: number;
  longestStreak: number;
  statLevels: Record<StatKey, number>;
  domainLogCounts: Record<Domain, number>;
  journalCount: number;
  /** Days taken to rebuild a streak after the last penalty; null if never penalized. */
  recoveredWithinDays: number | null;
}

export interface TitleDef {
  code: string;
  name: string;
  detail: string;
  test: (ctx: TitleContext) => boolean;
}

export function emptyTitleContext(): TitleContext {
  return {
    currentStreak: 0,
    longestStreak: 0,
    statLevels: Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Record<StatKey, number>,
    domainLogCounts: Object.fromEntries(DOMAINS.map((d) => [d, 0])) as Record<Domain, number>,
    journalCount: 0,
    recoveredWithinDays: null,
  };
}

const allStatsAtLeast = (ctx: TitleContext, n: number) =>
  STAT_KEYS.every((k) => ctx.statLevels[k] >= n);

export const TITLE_DEFS: readonly TitleDef[] = [
  { code: 'awakened', name: 'The Awakened', detail: 'Hold a 7-day streak.',
    test: (c) => c.longestStreak >= 7 },
  { code: 'iron_will', name: 'Iron Will', detail: 'Hold a 30-day streak.',
    test: (c) => c.longestStreak >= 30 },
  { code: 'monarch_of_iron', name: 'Monarch of Iron', detail: 'Log 100 physical days.',
    test: (c) => c.domainLogCounts.physical >= 100 },
  { code: 'well_read', name: 'Well-Read', detail: 'Log 50 intellectual days.',
    test: (c) => c.domainLogCounts.intellectual >= 50 },
  { code: 'perfect_tempo', name: 'Perfect Tempo', detail: 'Log 30 musical days.',
    test: (c) => c.domainLogCounts.musical >= 30 },
  { code: 'the_devout', name: 'The Devout', detail: 'Log 30 spiritual days.',
    test: (c) => c.domainLogCounts.spiritual >= 30 },
  { code: 'beloved', name: 'Beloved', detail: 'Log 25 social days.',
    test: (c) => c.domainLogCounts.social >= 25 },
  { code: 'solvent', name: 'Solvent', detail: 'Log 60 financial days.',
    test: (c) => c.domainLogCounts.financial >= 60 },
  { code: 'two_as_one', name: 'Two as One', detail: 'Log 60 marital days.',
    test: (c) => c.domainLogCounts.marital >= 60 },
  { code: 'balanced', name: 'Balanced', detail: 'Bring all seven stats to 10.',
    test: (c) => allStatsAtLeast(c, 10) },
  { code: 'shadow_sovereign', name: 'Shadow Sovereign', detail: 'Bring all seven stats to 20.',
    test: (c) => allStatsAtLeast(c, 20) },
  { code: 'chronicler', name: 'Chronicler', detail: 'Write 100 journal entries.',
    test: (c) => c.journalCount >= 100 },
  { code: 'the_persistent', name: 'The Persistent',
    detail: 'Rebuild a streak within 2 days of a penalty.',
    test: (c) => c.recoveredWithinDays !== null && c.recoveredWithinDays <= 2 },
] as const;

/** Titles newly earned by this context that are not already unlocked. */
export function evaluateTitles(
  ctx: TitleContext, unlocked: ReadonlySet<string>,
): TitleDef[] {
  return TITLE_DEFS.filter((t) => !unlocked.has(t.code) && t.test(ctx));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hq-app && npx vitest run src/system/titles.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Run the whole system suite and commit**

Run: `cd hq-app && npm test`
Expected: PASS — all suites green (dates, levels, stats, xp, streaks, penalties, titles, types, smoke).

```bash
git add hq-app/src/system/titles.ts hq-app/src/system/titles.test.ts
git commit -m "feat(hq): title definitions and unlock evaluation"
```

---

### Task 9: Database schema and RLS

**Files:**
- Create: `hq-backend/supabase/config.toml`, `hq-backend/supabase/migrations/0001_schema.sql`, `hq-backend/supabase/migrations/0002_rls.sql`

**Interfaces:**
- Consumes: the `Domain` union from Task 2 — the enum values must match exactly.
- Produces: the `hq` schema with 10 tables, all RLS-gated by `hq.is_owner()`, reachable through PostgREST.

- [ ] **Step 1: Initialise the backend project**

```bash
cd "/Users/quinnkb/Desktop/Dev Projects/heyspence.me"
mkdir -p hq-backend && cd hq-backend
supabase init
supabase link --project-ref utvurjzrvnghbmzjrrhq
```

- [ ] **Step 2: Record the intended config — but DO NOT push it**

In `hq-backend/supabase/config.toml`, set `project_id` and add `hq` to the API schemas, for local-dev correctness and as documentation of intent.

**Never run `supabase config push` from `hq-backend`.** `config push` writes the WHOLE config file, not just the `[api]` section. The live project's auth settings were pushed from `jobs-backend/supabase/config.toml` (`site_url = "https://www.heyspence.me/jobs/"`); pushing a fresh config from here would overwrite them and break sign-in for the existing job board.

Exposing the `hq` schema is instead a one-time manual dashboard step: **Supabase → `heyspence` → Project Settings → API → Exposed schemas → add `hq`**. Until that is done, PostgREST returns "schema must be one of the following: public" for every HQ query. Migrations (`supabase db push`) are unaffected and safe to run now — they are additive DDL in a new schema and touch neither `public` (job board) nor `case_hub`.

```toml
project_id = "heyspence"

[api]
enabled = true
schemas = ["public", "graphql_public", "hq"]
extra_search_path = ["public", "extensions"]
max_rows = 1000
```

- [ ] **Step 3: Write the schema migration**

`hq-backend/supabase/migrations/0001_schema.sql`:

```sql
-- 0001_schema.sql — HQ "The System". All objects live in the `hq` schema,
-- isolated from the job board (public) and Case Hub (case_hub).

create schema if not exists hq;

-- Seven life domains, fixed. An eighth requires a migration on purpose.
create type hq.domain as enum (
  'physical', 'intellectual', 'spiritual', 'social', 'musical', 'financial', 'marital'
);

create type hq.cadence     as enum ('daily', 'weekdays', 'n_per_week');
create type hq.xp_kind     as enum ('habit','task','journal','milestone','goal','photo','quest_bonus','penalty');
create type hq.pose        as enum ('front','side','back','other');
create type hq.goal_status as enum ('active','done','dropped');
create type hq.task_status as enum ('open','done','dropped');

create table hq.habits (
  id              uuid primary key default gen_random_uuid(),
  name            text        not null,
  domain          hq.domain   not null,
  cadence         hq.cadence  not null default 'daily',
  weekdays        int[],                       -- 0=Sun..6=Sat, for 'weekdays'
  target_per_week int,                         -- for 'n_per_week'
  target_count    int         not null default 1,
  xp_value        int         not null default 25,
  sort_order      int         not null default 0,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  constraint weekdays_when_needed check (cadence <> 'weekdays' or weekdays is not null),
  constraint target_when_needed   check (cadence <> 'n_per_week' or target_per_week is not null)
);

create table hq.habit_logs (
  habit_id   uuid not null references hq.habits(id) on delete cascade,
  log_date   date not null,
  count      int  not null default 1 check (count >= 0),
  created_at timestamptz not null default now(),
  primary key (habit_id, log_date)
);
create index habit_logs_date_idx on hq.habit_logs (log_date desc);

create table hq.goals (
  id           uuid primary key default gen_random_uuid(),
  domain       hq.domain      not null,
  title        text           not null,
  detail       text,
  target_date  date,
  status       hq.goal_status not null default 'active',
  completed_at timestamptz,
  created_at   timestamptz    not null default now()
);

create table hq.milestones (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references hq.goals(id) on delete cascade,
  title      text not null,
  sort_order int  not null default 0,
  done_at    timestamptz
);

create table hq.tasks (
  id           uuid primary key default gen_random_uuid(),
  domain       hq.domain      not null,
  goal_id      uuid references hq.goals(id) on delete set null,
  title        text           not null,
  notes        text,
  due_date     date,
  is_focus     boolean        not null default false,
  status       hq.task_status not null default 'open',
  completed_at timestamptz,
  created_at   timestamptz    not null default now()
);
create index tasks_focus_idx on hq.tasks (is_focus) where status = 'open';

create table hq.journal_entries (
  entry_date date primary key,
  body       text not null default '',
  mood       int check (mood between 1 and 5),
  energy     int check (energy between 1 and 5),
  lesson     text,
  created_at timestamptz not null default now()
);

create table hq.progress_photos (
  id           uuid primary key default gen_random_uuid(),
  taken_on     date    not null,
  pose         hq.pose not null default 'front',
  storage_path text    not null unique,
  weight_lb    numeric(5,1),
  bodyfat_pct  numeric(4,1),
  note         text,
  created_at   timestamptz not null default now()
);
create index progress_photos_taken_idx on hq.progress_photos (taken_on desc);

-- Append-only EXP ledger. Levels and stats are DERIVED from this; never
-- store a mutable counter. Negative amounts are penalties.
create table hq.xp_events (
  id          uuid primary key default gen_random_uuid(),
  domain      hq.domain,                  -- null for whole-player events
  amount      int        not null,
  kind        hq.xp_kind not null,
  ref_id      uuid,
  occurred_on date       not null default current_date,
  created_at  timestamptz not null default now()
);
create index xp_events_occurred_idx on hq.xp_events (occurred_on desc);
-- One habit tick per habit per day can only ever award EXP once.
create unique index xp_events_habit_once_idx
  on hq.xp_events (ref_id, occurred_on) where kind = 'habit';

create table hq.titles (
  code        text primary key,
  unlocked_at timestamptz not null default now()
);

create table hq.penalties (
  penalty_date     date primary key,
  missed_habit_ids uuid[] not null default '{}',
  xp_lost          int    not null default 0,   -- stored positive
  streak_before    int    not null default 0,
  created_at       timestamptz not null default now()
);
```

- [ ] **Step 4: Write the RLS migration**

`hq-backend/supabase/migrations/0002_rls.sql`:

```sql
-- 0002_rls.sql — HQ is PRIVATE to one person. Gate every table to one email,
-- mirroring public.is_job_owner() on the job board.

create or replace function hq.is_owner() returns boolean as $$
  select (auth.jwt() ->> 'email') = 'espencer.quinn@gmail.com';
$$ language sql stable;

grant usage on schema hq to authenticated;
grant all on all tables in schema hq to authenticated;
grant all on all sequences in schema hq to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'habits','habit_logs','goals','milestones','tasks',
    'journal_entries','progress_photos','xp_events','titles','penalties'
  ] loop
    execute format('alter table hq.%I enable row level security', t);
    execute format(
      'create policy %I on hq.%I for all to authenticated
         using (hq.is_owner()) with check (hq.is_owner())',
      t || '_owner_all', t);
  end loop;
end $$;
```

- [ ] **Step 5: Push the migrations**

Run: `cd hq-backend && supabase db push`
Expected: both migrations applied.

Do **not** run `supabase config push` — see Step 2.

- [ ] **Step 6: Verify the schema is reachable and locked**

Run:

```bash
cd hq-backend
supabase db push --dry-run   # expect: no pending migrations
```

Then in the Supabase SQL editor, confirm the guard rejects a stranger:

```sql
select hq.is_owner();  -- expect false when run as an anon/other role
select count(*) from hq.habits;  -- expect 0
```

Expected: the tables exist, `hq.is_owner()` exists, RLS is enabled on all 10 tables. PostgREST will not see the schema until the manual dashboard step in Step 2 is done; that does not block these migrations.

- [ ] **Step 7: Commit**

```bash
cd "/Users/quinnkb/Desktop/Dev Projects/heyspence.me"
git add hq-backend/supabase/config.toml hq-backend/supabase/migrations
git commit -m "feat(hq): hq schema, 10 tables, single-owner RLS"
```

---

### Task 10: Photo storage bucket and seed habits

**Files:**
- Create: `hq-backend/supabase/migrations/0003_storage.sql`, `hq-backend/supabase/migrations/0004_seed.sql`

**Interfaces:**
- Consumes: `hq.is_owner()` from Task 9.
- Produces: a private `hq-photos` bucket readable/writable only by the owner; one starter habit per domain so the Daily Quest is non-empty on first sign-in.

- [ ] **Step 1: Write the storage migration**

`hq-backend/supabase/migrations/0003_storage.sql`:

```sql
-- 0003_storage.sql — private bucket for BODY RECORD progress photos.
-- Private means objects are never publicly addressable; the app reads them
-- through short-lived signed URLs only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hq-photos', 'hq-photos', false, 10485760,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "hq_photos_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'hq-photos' and hq.is_owner());

create policy "hq_photos_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'hq-photos' and hq.is_owner());

create policy "hq_photos_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'hq-photos' and hq.is_owner());
```

- [ ] **Step 2: Write the seed migration**

`hq-backend/supabase/migrations/0004_seed.sql`:

```sql
-- 0004_seed.sql — starter habits covering every domain so the first Daily Quest is
-- not empty. These are ordinary rows; edit or archive them in the app.

insert into hq.habits (name, domain, cadence, weekdays, target_per_week, target_count, xp_value, sort_order)
values
  ('Gym',                  'physical',     'n_per_week', null, 4,    1,     40, 10),
  ('10,000 steps',         'physical',     'daily',      null, null, 10000, 30, 20),
  ('Read 30 minutes',      'intellectual', 'daily',      null, null, 1,     30, 30),
  ('Scripture & prayer',   'spiritual',    'daily',      null, null, 1,     25, 40),
  ('Reach out to someone', 'social',       'weekdays',   '{1,2,3,4,5}', null, 1, 25, 50),
  ('Instrument practice',  'musical',      'daily',      null, null, 1,     35, 60),
  ('Log the day''s spend', 'financial',    'daily',      null, null, 1,     20, 70),
  ('Undistracted time together', 'marital', 'daily',      null, null, 1,     35, 80),
  ('Date night',           'marital',      'n_per_week', null, 1,    1,     50, 90)
on conflict do nothing;
```

- [ ] **Step 3: Push and verify**

Run: `cd hq-backend && supabase db push`
Expected: both migrations apply.

Then in the Supabase dashboard → Storage, confirm `hq-photos` exists and is **not** public. In the SQL editor:

```sql
select name, domain, cadence from hq.habits order by sort_order;
```

Expected: 9 rows, one or two per domain, all seven domains represented.

- [ ] **Step 4: Commit**

```bash
cd "/Users/quinnkb/Desktop/Dev Projects/heyspence.me"
git add hq-backend/supabase/migrations
git commit -m "feat(hq): private photo bucket and starter habits"
```

---

### Task 11: Supabase client and the Google auth gate

**Files:**
- Create: `hq-app/src/supabaseClient.ts`, `hq-app/src/auth/AuthGate.tsx`, `hq-app/.env.local` (untracked)
- Modify: `hq-app/src/App.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `supabase` (a `SupabaseClient` scoped to the `hq` schema), and `<AuthGate>{children}</AuthGate>` which renders children only for the owner.

**Manual prerequisite — do this before Step 5:**
1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** → Web application. Add authorized redirect URI `https://utvurjzrvnghbmzjrrhq.supabase.co/auth/v1/callback`.
2. Supabase → `heyspence` → Authentication → Providers → **Google** → paste Client ID + Client Secret → Enable.
3. Supabase → Authentication → URL Configuration → add `https://www.heyspence.me/hq/` and `http://localhost:5173/hq/` to Redirect URLs.

- [ ] **Step 1: Create the env file (untracked — it is in `.gitignore` from Task 1)**

`hq-app/.env.local`:

```
VITE_SUPABASE_URL=https://utvurjzrvnghbmzjrrhq.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Supabase → Project Settings → API>
```

- [ ] **Step 2: Write the client**

`hq-app/src/supabaseClient.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

// db.schema pins every query to `hq`, so data modules call .from('habits')
// rather than repeating the schema. Requires "hq" in config.toml api.schemas.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { db: { schema: 'hq' } },
);
```

- [ ] **Step 3: Write the auth gate**

`hq-app/src/auth/AuthGate.tsx`:

```tsx
import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

// SECURITY: HQ is private to one person. Authorize on the signed-in email.
// hq.is_owner() enforces this independently at the database; this gate is
// only the friendly front door.
const OWNER_EMAIL = 'espencer.quinn@gmail.com';

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    });
    if (error) setError(error.message);
  }

  if (!ready) return <div className="boot">ESTABLISHING CONNECTION…</div>;

  if (!session) {
    return (
      <div className="gate">
        <div className="gate__panel">
          <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
          <p className="gate__eyebrow">[ SYSTEM ]</p>
          <h1 className="gate__title">HQ</h1>
          <p className="gate__lead">Access is restricted to the Player.</p>
          <button className="btn" onClick={signIn}>Sign in with Google</button>
          {error && <p className="gate__error">{error}</p>}
        </div>
      </div>
    );
  }

  if (session.user.email?.toLowerCase() !== OWNER_EMAIL) {
    return (
      <div className="gate">
        <div className="gate__panel">
          <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
          <p className="gate__eyebrow">[ DENIED ]</p>
          <h1 className="gate__title">Not authorized</h1>
          <p className="gate__lead">{session.user.email} is not the Player.</p>
          <button className="btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 4: Wire it into App**

`hq-app/src/App.tsx`:

```tsx
import { AuthGate } from './auth/AuthGate';

export default function App() {
  return (
    <AuthGate>
      <div style={{ color: '#5ad8ff', padding: 24 }}>SYSTEM ONLINE</div>
    </AuthGate>
  );
}
```

- [ ] **Step 5: Verify sign-in end to end**

Run: `cd hq-app && npm run dev`, open `http://localhost:5173/hq/`.
Expected: the gate renders; "Sign in with Google" redirects to Google, returns to `/hq/`, and "SYSTEM ONLINE" appears. Signing in with any other Google account shows "Not authorized".

- [ ] **Step 6: Commit**

```bash
git add hq-app/src/supabaseClient.ts hq-app/src/auth/AuthGate.tsx hq-app/src/App.tsx
git commit -m "feat(hq): supabase client on hq schema and Google-only auth gate"
```

---

### Task 12: Design tokens, frame primitives, shell, and router

**Files:**
- Create: `hq-app/src/ui/tokens.css`, `hq-app/src/ui/system.css`, `hq-app/src/ui/Frame.tsx`, `hq-app/src/ui/Rail.tsx`, `hq-app/src/ui/Shell.tsx`, `hq-app/src/router.tsx`
- Modify: `hq-app/src/main.tsx` (import the stylesheets), `hq-app/src/App.tsx`

**Interfaces:**
- Consumes: `DOMAINS`, `DOMAIN_LABEL` from `../types`.
- Produces:
  - `useRoute(): Route` and `navigate(to: string): void` from `router.tsx`, where `type Route = { name: 'status' } | { name: 'domain'; domain: Domain } | { name: 'body' } | { name: 'notFound' }`
  - `<Frame title? meta? children>` — the bracketed panel used by every screen
  - `<Shell>{children}</Shell>` — top bar + rail + main region

- [ ] **Step 1: Write the design tokens**

`hq-app/src/ui/tokens.css` — copy the `:root` block, `body` rules, ambient layers, `.frame`/`.c` corner system, `.rail`, `.topbar`, `.ghost`, and the `@media (max-width: 900px)` and `prefers-reduced-motion` blocks **verbatim from the approved mockup** at `https://claude.ai/code/artifact/c7c1ae5b-5761-41d2-b7d3-39feda53a40e`, adding the sixth stat color:

```css
:root {
  --void: #04070f;  --abyss: #070d19;
  --panel: rgba(10, 21, 38, 0.72);  --panel-2: rgba(8, 16, 30, 0.9);
  --line: rgba(90, 216, 255, 0.24); --line-dim: rgba(90, 216, 255, 0.10);
  --system: #5ad8ff; --system-lo: #2b8ec2;
  --ether: #dff2ff;  --mute: #6f8ba6; --mute-lo: #47607a;
  --penalty: #ff4d6a;
  --str: #5ad8ff; --int: #7f9cff; --wis: #b28cff;
  --cha: #4fe3b0; --sense: #ff9ad5; --for: #ffc46b;
  --glow: 0 0 14px rgba(90, 216, 255, 0.40);
  --glow-s: 0 0 6px rgba(90, 216, 255, 0.55);
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px;
  --s5: 24px; --s6: 32px; --s7: 48px;
  --rail: 148px;
  color-scheme: dark;
}
```

**Single theme.** Do not add `prefers-color-scheme` branches — HQ is dark by design. `body` must set `background: var(--void)` explicitly.

- [ ] **Step 2: Write the router**

`hq-app/src/router.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { DOMAINS, type Domain } from './types';

export type Route =
  | { name: 'status' }
  | { name: 'domain'; domain: Domain }
  | { name: 'body' }
  | { name: 'notFound' };

const BASE = import.meta.env.BASE_URL.replace(/\/$/, ''); // '/hq'

export function parse(pathname: string): Route {
  const rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  const seg = rest.replace(/^\/|\/$/g, '');
  if (seg === '' || seg === 'status') return { name: 'status' };
  if (seg === 'body') return { name: 'body' };
  const d = DOMAINS.find((x) => x === seg);
  if (d) return { name: 'domain', domain: d };
  return { name: 'notFound' };
}

export function navigate(to: string): void {
  window.history.pushState({}, '', `${BASE}/${to}`.replace(/\/+$/, '') || `${BASE}/`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.pathname));
  useEffect(() => {
    const onPop = () => setRoute(parse(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return route;
}
```

- [ ] **Step 3: Write the Frame primitive**

`hq-app/src/ui/Frame.tsx`:

```tsx
import type { ReactNode } from 'react';

export function Frame(props: {
  title?: string;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const { title, meta, className, children } = props;
  return (
    <section className={`frame ${className ?? ''}`}>
      <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
      {title && (
        <div className="frame__head">
          <span className="frame__title">{title}</span>
          {meta && <span className="frame__meta">{meta}</span>}
        </div>
      )}
      {children}
    </section>
  );
}
```

- [ ] **Step 4: Write the Rail and Shell**

`hq-app/src/ui/Rail.tsx`:

```tsx
import { DOMAINS, DOMAIN_LABEL } from '../types';
import { navigate, useRoute } from '../router';

export function Rail() {
  const route = useRoute();
  const isDomain = route.name === 'domain';

  const item = (key: string, label: string, to: string, active: boolean, sub = false) => (
    <button
      key={key}
      className={`rail__item ${sub ? 'rail__item--sub' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={() => navigate(to)}
    >
      <i className="pip" />
      <span>{label}</span>
    </button>
  );

  return (
    <nav className="rail" aria-label="Sections">
      {item('status', 'Status', 'status', route.name === 'status')}
      <div className="rail__group only-desktop">[ DOMAINS ]</div>
      {DOMAINS.map((d) =>
        item(d, DOMAIN_LABEL[d], d, isDomain && route.domain === d, true))}
      {item('body', 'Body', 'body', route.name === 'body')}
    </nav>
  );
}
```

On mobile the six `rail__item--sub` entries are hidden by the `only-desktop` rule and replaced by a single "Domains" entry that navigates to the first domain — six destinations do not fit a phone bottom bar. Add that mobile-only button after the `[ DOMAINS ]` label, mirroring the mockup markup.

`hq-app/src/ui/Shell.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Rail } from './Rail';
import { formatShort, todayISO } from '../system/dates';
import { supabase } from '../supabaseClient';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="grille" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="app">
        <header className="topbar">
          <div className="brand">HQ <span>//</span> SYSTEM</div>
          <div className="clock">{formatShort(todayISO())}</div>
          <div className="topbar__spacer" />
          <button className="ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </header>
        <Rail />
        <main>{children}</main>
      </div>
    </>
  );
}
```

- [ ] **Step 5: Wire the shell and routes into App**

`hq-app/src/App.tsx`:

```tsx
import { AuthGate } from './auth/AuthGate';
import { Shell } from './ui/Shell';
import { useRoute } from './router';
import { Frame } from './ui/Frame';

function Routed() {
  const route = useRoute();
  switch (route.name) {
    case 'status': return <Frame title="Status">STATUS</Frame>;
    case 'domain': return <Frame title={route.domain}>DOMAIN</Frame>;
    case 'body':   return <Frame title="Body Record">BODY</Frame>;
    default:       return <Frame title="Not found">No such page.</Frame>;
  }
}

export default function App() {
  return (
    <AuthGate>
      <Shell><Routed /></Shell>
    </AuthGate>
  );
}
```

Import both stylesheets at the top of `hq-app/src/main.tsx`:

```tsx
import './ui/tokens.css';
import './ui/system.css';
```

- [ ] **Step 6: Verify the shell renders and routes**

Run: `cd hq-app && npm run dev`
Expected: the System shell renders dark with the cyan rail. Clicking each rail entry changes the panel and the URL (`/hq/physical`, `/hq/body`). A browser reload on `/hq/physical` still works in production because of the Netlify rewrite; in dev, Vite serves the SPA for unknown paths.

- [ ] **Step 7: Commit**

```bash
git add hq-app/src/ui hq-app/src/router.tsx hq-app/src/App.tsx hq-app/src/main.tsx
git commit -m "feat(hq): design tokens, frame primitive, shell, and router"
```

---

### Task 13: Data layer and derived system state

**Files:**
- Create: `hq-app/src/data/habits.ts`, `hq-app/src/data/habitLogs.ts`, `hq-app/src/data/xpEvents.ts`, `hq-app/src/data/titles.ts`, `hq-app/src/data/penalties.ts`, `hq-app/src/data/snapshot.ts`, `hq-app/src/state/SystemContext.tsx`
- Test: `hq-app/src/system/derive.test.ts`
- Create: `hq-app/src/system/derive.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–8; `supabase` from Task 11.
- Produces:
  - `derive.ts` — `derivePlayer(events, habits, index, today): PlayerState` where `PlayerState = { totalXp: number; level: number; rank: Rank; into: number; need: number; pct: number; statLevels: Record<StatKey, number>; domainXp: Record<Domain, number>; questStreak: number }`
  - `snapshot.ts` — `loadSnapshot(): Promise<Snapshot>` with `Snapshot = { habits: Habit[]; logs: HabitLog[]; events: XpEvent[]; titles: TitleRow[]; penalties: Penalty[] }`
  - `SystemContext.tsx` — `useSystem(): { snapshot: Snapshot; player: PlayerState; today: string; index: Map<string, number>; reload(): Promise<void>; tickHabit(h: Habit, count: number): Promise<void> }`

- [ ] **Step 1: Write the failing test for derivation**

`hq-app/src/system/derive.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { derivePlayer, questStreakFrom } from './derive';
import { buildLogIndex } from './streaks';
import { cumulativeXpFor } from './levels';
import type { Habit, HabitLog, XpEvent } from '../types';

const habit = (id: string, over: Partial<Habit> = {}): Habit => ({
  id, name: id, domain: 'physical', cadence: 'daily', weekdays: null,
  target_per_week: null, target_count: 1, xp_value: 25, sort_order: 0,
  archived_at: null, ...over,
});

const ev = (amount: number, domain: XpEvent['domain'], kind: XpEvent['kind'] = 'habit'): XpEvent =>
  ({ id: crypto.randomUUID(), amount, domain, kind, ref_id: null, occurred_on: '2026-08-31' });

const logs = (...p: Array<[string, string]>): HabitLog[] =>
  p.map(([habit_id, log_date]) => ({ habit_id, log_date, count: 1 }));

describe('derivePlayer', () => {
  it('is level 1 rank E with no events', () => {
    const p = derivePlayer([], [], buildLogIndex([]), '2026-08-31');
    expect(p.totalXp).toBe(0);
    expect(p.level).toBe(1);
    expect(p.rank).toBe('E');
    expect(p.statLevels.STR).toBe(0);
  });

  it('derives level and rank from the ledger total', () => {
    const events = [ev(cumulativeXpFor(14), 'physical'), ev(640, 'intellectual')];
    const p = derivePlayer(events, [], buildLogIndex([]), '2026-08-31');
    expect(p.level).toBe(14);
    expect(p.rank).toBe('D');
    expect(p.into).toBe(640);
    expect(p.need).toBe(1000);
  });

  it('derives per-stat levels from per-domain pools', () => {
    const p = derivePlayer([ev(1200, 'musical')], [], buildLogIndex([]), '2026-08-31');
    expect(p.statLevels.SENSE).toBe(10);
    expect(p.statLevels.STR).toBe(0);
  });

  it('excludes null-domain events from stats but counts them in the total', () => {
    const p = derivePlayer([ev(100, null, 'quest_bonus')], [], buildLogIndex([]), '2026-08-31');
    expect(p.totalXp).toBe(100);
    expect(p.statLevels.STR).toBe(0);
  });

  it('subtracts penalties from the total', () => {
    const p = derivePlayer(
      [ev(1000, 'physical'), ev(-40, null, 'penalty')], [], buildLogIndex([]), '2026-08-31');
    expect(p.totalXp).toBe(960);
  });
});

describe('questStreakFrom', () => {
  it('counts consecutive fully-cleared days ending yesterday or today', () => {
    const hs = [habit('a'), habit('b')];
    const idx = buildLogIndex(logs(
      ['a', '2026-08-29'], ['b', '2026-08-29'],
      ['a', '2026-08-30'], ['b', '2026-08-30'],
    ));
    expect(questStreakFrom(hs, idx, '2026-08-31')).toBe(2);
  });

  it('is zero when yesterday was incomplete', () => {
    const hs = [habit('a'), habit('b')];
    const idx = buildLogIndex(logs(['a', '2026-08-30']));
    expect(questStreakFrom(hs, idx, '2026-08-31')).toBe(0);
  });

  it('counts today when today is already fully cleared', () => {
    const hs = [habit('a')];
    const idx = buildLogIndex(logs(['a', '2026-08-30'], ['a', '2026-08-31']));
    expect(questStreakFrom(hs, idx, '2026-08-31')).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hq-app && npx vitest run src/system/derive.test.ts`
Expected: FAIL — cannot resolve `./derive`.

- [ ] **Step 3: Write the derivation module**

`hq-app/src/system/derive.ts`:

```ts
import {
  DOMAINS, STAT_KEYS, STAT_OF,
  type Domain, type Habit, type Rank, type StatKey, type XpEvent,
} from '../types';
import { addDays } from './dates';
import { levelProgress, rankFromLevel } from './levels';
import { statLevelFromXp } from './stats';
import { dueHabitsOn, isMetOn } from './streaks';
import { domainTotals, playerTotal } from './xp';

const MAX_SCAN = 400;

export interface PlayerState {
  totalXp: number;
  level: number;
  rank: Rank;
  into: number;
  need: number;
  pct: number;
  statLevels: Record<StatKey, number>;
  domainXp: Record<Domain, number>;
  questStreak: number;
}

/** A day is "cleared" when every habit due that day hit its target. */
export function isDayCleared(
  habits: ReadonlyArray<Habit>, index: Map<string, number>, date: string,
): boolean {
  const due = dueHabitsOn(habits, date, index);
  if (due.length === 0) return false;
  return due.every((h) => isMetOn(h, date, index));
}

/**
 * Consecutive fully-cleared days. Today counts only if already cleared;
 * an in-progress today never breaks the run.
 */
export function questStreakFrom(
  habits: ReadonlyArray<Habit>, index: Map<string, number>, today: string,
): number {
  let streak = 0;
  let cursor = today;
  if (!isDayCleared(habits, index, today)) cursor = addDays(today, -1);
  for (let i = 0; i < MAX_SCAN; i++) {
    if (!isDayCleared(habits, index, cursor)) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function derivePlayer(
  events: ReadonlyArray<XpEvent>,
  habits: ReadonlyArray<Habit>,
  index: Map<string, number>,
  today: string,
): PlayerState {
  const totalXp = Math.max(0, playerTotal(events));
  const domainXp = domainTotals(events);
  const { level, into, need, pct } = levelProgress(totalXp);

  const statLevels = Object.fromEntries(
    STAT_KEYS.map((k) => [k, 0]),
  ) as Record<StatKey, number>;
  for (const d of DOMAINS) statLevels[STAT_OF[d]] = statLevelFromXp(domainXp[d]);

  return {
    totalXp, level, rank: rankFromLevel(level), into, need, pct,
    statLevels, domainXp,
    questStreak: questStreakFrom(habits, index, today),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hq-app && npx vitest run src/system/derive.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Write the data modules**

`hq-app/src/data/habits.ts`:

```ts
import { supabase } from '../supabaseClient';
import type { Habit } from '../types';

export async function listHabits(): Promise<Habit[]> {
  const { data, error } = await supabase.from('habits').select('*').order('sort_order');
  if (error) throw error;
  return data as Habit[];
}

export async function createHabit(h: Omit<Habit, 'id'>): Promise<Habit> {
  const { data, error } = await supabase.from('habits').insert(h).select().single();
  if (error) throw error;
  return data as Habit;
}

export async function updateHabit(id: string, patch: Partial<Habit>): Promise<void> {
  const { error } = await supabase.from('habits').update(patch).eq('id', id);
  if (error) throw error;
}

export async function archiveHabit(id: string): Promise<void> {
  await updateHabit(id, { archived_at: new Date().toISOString() });
}
```

`hq-app/src/data/habitLogs.ts`:

```ts
import { supabase } from '../supabaseClient';
import type { HabitLog } from '../types';

/** Logs from `sinceISO` forward. 400 days back covers the longest streak scan. */
export async function listLogs(sinceISO: string): Promise<HabitLog[]> {
  const { data, error } = await supabase
    .from('habit_logs').select('habit_id, log_date, count').gte('log_date', sinceISO);
  if (error) throw error;
  return data as HabitLog[];
}

export async function setLog(habitId: string, date: string, count: number): Promise<void> {
  if (count <= 0) {
    const { error } = await supabase
      .from('habit_logs').delete().eq('habit_id', habitId).eq('log_date', date);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('habit_logs')
    .upsert({ habit_id: habitId, log_date: date, count }, { onConflict: 'habit_id,log_date' });
  if (error) throw error;
}
```

`hq-app/src/data/xpEvents.ts`:

```ts
import { supabase } from '../supabaseClient';
import type { Domain, XpEvent, XpKind } from '../types';

export async function listEvents(): Promise<XpEvent[]> {
  const { data, error } = await supabase
    .from('xp_events').select('id, domain, amount, kind, ref_id, occurred_on');
  if (error) throw error;
  return data as XpEvent[];
}

export interface AwardInput {
  amount: number;
  kind: XpKind;
  domain?: Domain | null;
  refId?: string | null;
  occurredOn: string;
}

/**
 * Append to the ledger. For habit ticks the DB has a unique index on
 * (ref_id, occurred_on) where kind='habit', so a double-tick cannot
 * double-award; a 23505 conflict is expected and swallowed.
 */
export async function award(input: AwardInput): Promise<void> {
  const { error } = await supabase.from('xp_events').insert({
    amount: input.amount,
    kind: input.kind,
    domain: input.domain ?? null,
    ref_id: input.refId ?? null,
    occurred_on: input.occurredOn,
  });
  if (error && error.code !== '23505') throw error;
}

export async function revokeHabitAward(habitId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from('xp_events').delete()
    .eq('kind', 'habit').eq('ref_id', habitId).eq('occurred_on', date);
  if (error) throw error;
}
```

`hq-app/src/data/titles.ts`:

```ts
import { supabase } from '../supabaseClient';
import type { TitleRow } from '../types';

export async function listTitles(): Promise<TitleRow[]> {
  const { data, error } = await supabase.from('titles').select('code, unlocked_at');
  if (error) throw error;
  return data as TitleRow[];
}

export async function unlockTitle(code: string): Promise<void> {
  const { error } = await supabase.from('titles').insert({ code });
  if (error && error.code !== '23505') throw error;
}
```

`hq-app/src/data/penalties.ts`:

```ts
import { supabase } from '../supabaseClient';
import type { Penalty } from '../types';

export async function listPenalties(): Promise<Penalty[]> {
  const { data, error } = await supabase
    .from('penalties').select('penalty_date, missed_habit_ids, xp_lost, streak_before');
  if (error) throw error;
  return data as Penalty[];
}

export async function recordPenalty(p: Penalty): Promise<void> {
  const { error } = await supabase.from('penalties').insert(p);
  if (error && error.code !== '23505') throw error;
}
```

`hq-app/src/data/snapshot.ts`:

```ts
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
```

- [ ] **Step 6: Write the SystemContext**

`hq-app/src/state/SystemContext.tsx`:

```tsx
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
    // Clear any prior failure first: without this, one transient error strands
    // the UI in the SYSTEM ERROR branch permanently, and the retry control
    // lives inside the subtree that stopped rendering.
    setError('');
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
```

- [ ] **Step 7: Wrap the app and verify against real data**

In `hq-app/src/App.tsx`, wrap `<Shell>` in `<SystemProvider>`:

```tsx
import { SystemProvider } from './state/SystemContext';
// ...
<AuthGate>
  <SystemProvider>
    <Shell><Routed /></Shell>
  </SystemProvider>
</AuthGate>
```

Run: `cd hq-app && npm run dev`
Expected: after sign-in the shell renders (no "LOADING PLAYER DATA…" stuck state), meaning the `hq` schema is reachable and RLS admits the owner. If it hangs on loading, the `hq` schema has not been added to **Exposed schemas** in the Supabase dashboard (Project Settings → API) — see Task 9 Step 2.

- [ ] **Step 8: Run the full suite and commit**

Run: `cd hq-app && npm test`
Expected: PASS, all suites.

```bash
git add hq-app/src/data hq-app/src/state hq-app/src/system/derive.ts \
        hq-app/src/system/derive.test.ts hq-app/src/App.tsx
git commit -m "feat(hq): data layer, snapshot load, and derived player state"
```

---

### Task 14: STATUS — player card and stat block

**Files:**
- Create: `hq-app/src/ui/XpBar.tsx`, `hq-app/src/ui/StatBlock.tsx`, `hq-app/src/ui/PlayerCard.tsx`, `hq-app/src/screens/Status.tsx`
- Modify: `hq-app/src/App.tsx` (route `status` → `<Status />`), `hq-app/src/ui/system.css`

**Interfaces:**
- Consumes: `useSystem()` from Task 13; `STAT_KEYS`, `DOMAIN_OF`, `DOMAIN_COLOR` from `../types`; `statProgress` from `../system/stats`; `nextRankAt` from `../system/levels`.
- Produces: `<PlayerCard />`, `<StatBlock />`, `<XpBar into need pct />`, `<Status />`.

- [ ] **Step 1: Write the XP bar**

`hq-app/src/ui/XpBar.tsx`:

```tsx
export function XpBar({ into, need, pct }: { into: number; need: number; pct: number }) {
  return (
    <div className="xp">
      <div className="xp__row">
        <span>EXP</span>
        <span><b>{into}</b> / {need}</span>
      </div>
      <div className="xp__track">
        <div className="xp__fill" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the stat block**

Twenty segments per stat, matching the mockup. A stat is flagged when its domain has gone untouched for 7+ days — this is the balance signal the whole six-domain design exists to produce.

`hq-app/src/ui/StatBlock.tsx`:

```tsx
import { DOMAIN_COLOR, DOMAIN_OF, STAT_KEYS, type StatKey } from '../types';
import { statProgress } from '../system/stats';
import { useSystem } from '../state/SystemContext';
import { daysBetween } from '../system/dates';

const SEGMENTS = 20;

/** Days since the most recent EXP event in this stat's domain, or null. */
function idleDays(stat: StatKey, events: { domain: string | null; occurred_on: string }[], today: string) {
  const domain = DOMAIN_OF[stat];
  const dates = events.filter((e) => e.domain === domain).map((e) => e.occurred_on).sort();
  const last = dates.at(-1);
  return last ? daysBetween(last, today) : null;
}

export function StatBlock() {
  const { player, snapshot, today } = useSystem();

  return (
    <div className="stats">
      <div className="stats__label">[ STATS ]</div>
      {STAT_KEYS.map((key) => {
        const level = player.statLevels[key];
        const color = DOMAIN_COLOR[DOMAIN_OF[key]];
        const idle = idleDays(key, snapshot.events, today);
        const neglected = idle === null || idle >= 7;
        const { pct } = statProgress(player.domainXp[DOMAIN_OF[key]]);

        return (
          <div className="stat" key={key} style={{ ['--k' as string]: color }} data-stat={key}>
            <span className="stat__key">{key}</span>
            <span className="stat__val">{level}</span>
            <span className="segs" title={`${Math.round(pct)}% to ${level + 1}`}>
              {Array.from({ length: SEGMENTS }, (_, i) => (
                <i key={i} className={`seg ${i < Math.min(level, SEGMENTS) ? 'on' : ''}`} />
              ))}
            </span>
            {neglected && (
              <span className="stat__note">
                NEGLECTED{idle !== null ? ` · ${idle} DAYS` : ''}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Write the player card**

`hq-app/src/ui/PlayerCard.tsx`:

```tsx
import { Frame } from './Frame';
import { StatBlock } from './StatBlock';
import { XpBar } from './XpBar';
import { useSystem } from '../state/SystemContext';
import { nextRankAt } from '../system/levels';
import { TITLE_DEFS } from '../system/titles';

export function PlayerCard() {
  const { player, snapshot } = useSystem();
  const latest = [...snapshot.titles].sort((a, b) =>
    a.unlocked_at < b.unlocked_at ? 1 : -1)[0];
  const title = latest ? TITLE_DEFS.find((t) => t.code === latest.code) : undefined;
  const promo = nextRankAt(player.level);

  return (
    <Frame title="Status" meta={promo ? `RANK ${promo.rank} AT LV.${promo.level}` : 'MAX RANK'}>
      <div className="player__id">
        <h1 className="player__name">Spencer Quinn</h1>
        <p className="player__title">
          TITLE · <b>{title ? title.name.toUpperCase() : 'UNRANKED'}</b>
        </p>
        <div className="lv">
          <div className="lv__num"><small>LEVEL</small><span>{player.level}</span></div>
          <div className="rank"><small>RANK</small><span>{player.rank}</span></div>
        </div>
      </div>

      <XpBar into={player.into} need={player.need} pct={player.pct} />
      <StatBlock />

      <div className="streak">
        <span>CURRENT STREAK</span>
        <span><b>{player.questStreak}</b> DAYS</span>
      </div>
    </Frame>
  );
}
```

- [ ] **Step 4: Write a minimal Status screen and route to it**

`hq-app/src/screens/Status.tsx`:

```tsx
import { PlayerCard } from '../ui/PlayerCard';

export function Status() {
  return (
    <>
      <PlayerCard />
    </>
  );
}
```

In `App.tsx`, replace the `status` case with `<Status />`.

- [ ] **Step 5: Copy the card, stat, and xp CSS**

Copy `.player__id`, `.player__name`, `.player__title`, `.lv`, `.lv__num`, `.rank`, `.xp*`, `.stats`, `.stat*`, `.segs`, `.seg`, and `.streak` rules **verbatim from the approved mockup** into `hq-app/src/ui/system.css`.

- [ ] **Step 6: Verify against real data**

Run: `cd hq-app && npm run dev`
Expected: the player card renders with LV.1 RANK E, all seven stats at 0 and flagged NEGLECTED (correct — nothing logged yet), and an empty EXP bar.

- [ ] **Step 7: Commit**

```bash
git add hq-app/src/ui/XpBar.tsx hq-app/src/ui/StatBlock.tsx \
        hq-app/src/ui/PlayerCard.tsx hq-app/src/screens/Status.tsx \
        hq-app/src/ui/system.css hq-app/src/App.tsx
git commit -m "feat(hq): player card, seven-stat block, and EXP bar"
```

---

### Task 15: STATUS — the Daily Quest

**Files:**
- Create: `hq-app/src/ui/ObjectiveRow.tsx`, `hq-app/src/ui/DailyQuest.tsx`
- Modify: `hq-app/src/screens/Status.tsx`, `hq-app/src/ui/system.css`

**Interfaces:**
- Consumes: `useSystem()`; `dueHabitsOn`, `isMetOn`, `logKey` from `../system/streaks`.
- Produces: `<DailyQuest />`, `<ObjectiveRow habit count met onToggle />`.

- [ ] **Step 1: Write the objective row**

`hq-app/src/ui/ObjectiveRow.tsx`:

```tsx
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
```

- [ ] **Step 2: Write the Daily Quest panel**

`hq-app/src/ui/DailyQuest.tsx`:

```tsx
import { Frame } from './Frame';
import { ObjectiveRow } from './ObjectiveRow';
import { useSystem } from '../state/SystemContext';
import { dueHabitsOn, isMetOn, logKey } from '../system/streaks';

/** Quest names cycle by date so the panel does not read identically forever. */
const QUEST_NAMES = [
  'Iron Discipline', 'Strange Training', 'The Long Road',
  'Quiet Resolve', 'Sharpened Edge', 'Steady Hand', 'The Daily Ordeal',
];

export function DailyQuest() {
  const { snapshot, index, today, tickHabit } = useSystem();
  const due = dueHabitsOn(snapshot.habits, today, index);
  const cleared = due.filter((h) => isMetOn(h, today, index)).length;

  const dayNumber = Number(today.replaceAll('-', '')) % QUEST_NAMES.length;
  const questName = QUEST_NAMES[dayNumber];

  return (
    <Frame title="Daily Quest" meta={`${cleared} / ${due.length} CLEARED`}>
      <div className="quest__intro">
        <h2 className="quest__name">[Daily Quest: <em>{questName}</em>] has arrived.</h2>
        <p className="quest__sub">RESETS AT MIDNIGHT · BONUS +100 EXP ON FULL CLEAR</p>
      </div>

      {due.length === 0 ? (
        <p className="quest__empty">No objectives due today. Add habits from a domain page.</p>
      ) : (
        due.map((h) => {
          const count = index.get(logKey(h.id, today)) ?? 0;
          const met = isMetOn(h, today, index);
          return (
            <ObjectiveRow
              key={h.id} habit={h} count={count} met={met}
              onToggle={() => void tickHabit(h, met ? 0 : h.target_count)}
            />
          );
        })
      )}

      <p className="warn">
        <span>
          <b>WARNING</b> — Failure to complete the daily quest resets the active
          streak and applies a −40 EXP debt. A penalty quest will be issued the
          following day.
        </span>
      </p>
    </Frame>
  );
}
```

- [ ] **Step 3: Add it to the Status screen**

`hq-app/src/screens/Status.tsx`:

```tsx
import { PlayerCard } from '../ui/PlayerCard';
import { DailyQuest } from '../ui/DailyQuest';

export function Status() {
  return (
    <>
      <PlayerCard />
      <DailyQuest />
    </>
  );
}
```

- [ ] **Step 4: Copy the objective and quest CSS**

Copy `.quest__intro`, `.quest__name`, `.quest__sub`, `.obj`, `.box`, `.obj__*`, `.chip`, and `.warn` rules verbatim from the mockup into `system.css`. Add:

```css
.quest__empty { padding: var(--s5) var(--s4); color: var(--mute); font-size: 13px; }
```

- [ ] **Step 5: Verify ticking writes through to the ledger**

Run: `cd hq-app && npm run dev`

Expected, in order:
1. Seven seeded objectives render, all unticked, `0 / 7 CLEARED`.
2. Clicking "Read 30 minutes" fills its box, the counter reads `[1/1]`, `INT` in the stat block gains EXP, and the EXP bar moves.
3. Reloading the page keeps the tick — it is in `hq.habit_logs`, not local state.
4. Clicking it again un-ticks it and the EXP is revoked (stat returns to its prior value).
5. In the Supabase SQL editor, `select * from hq.xp_events;` shows exactly one `habit` row per ticked habit per day, never two.

- [ ] **Step 6: Commit**

```bash
git add hq-app/src/ui/ObjectiveRow.tsx hq-app/src/ui/DailyQuest.tsx \
        hq-app/src/screens/Status.tsx hq-app/src/ui/system.css
git commit -m "feat(hq): daily quest objectives with ledger-backed ticking"
```

---

### Task 16: The NOTIFICATION system

This is the payoff of the whole design — the panel that fires when you clear the quest or level up. It is a queue, because clearing a quest often triggers a level-up in the same instant and both must be seen.

**Files:**
- Create: `hq-app/src/state/useNotifications.tsx`, `hq-app/src/ui/NotificationHost.tsx`
- Modify: `hq-app/src/state/SystemContext.tsx`, `hq-app/src/App.tsx`, `hq-app/src/ui/system.css`

**Interfaces:**
- Consumes: `useSystem()`.
- Produces: `NotificationProvider`, `useNotify(): (n: SystemNotice) => void`, and
  `SystemNotice = { tone?: 'system' | 'penalty'; kind: string; huge?: string; lead?: string; deltas?: { text: string; color?: string }[]; fine?: string }`.

- [ ] **Step 1: Write the queue**

`hq-app/src/state/useNotifications.tsx`:

```tsx
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface SystemNotice {
  tone?: 'system' | 'penalty';
  kind: string;
  huge?: string;
  lead?: string;
  deltas?: Array<{ text: string; color?: string }>;
  fine?: string;
}

interface NoticeValue {
  current: SystemNotice | null;
  push: (n: SystemNotice) => void;
  dismiss: () => void;
}

const Ctx = createContext<NoticeValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<SystemNotice[]>([]);
  const push = useCallback((n: SystemNotice) => setQueue((q) => [...q, n]), []);
  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), []);
  const value = useMemo(
    () => ({ current: queue[0] ?? null, push, dismiss }), [queue, push, dismiss]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotices(): NoticeValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNotices must be used inside <NotificationProvider>');
  return v;
}

export function useNotify(): (n: SystemNotice) => void {
  return useNotices().push;
}
```

- [ ] **Step 2: Write the host panel**

`hq-app/src/ui/NotificationHost.tsx`:

```tsx
import { useEffect } from 'react';
import { useNotices } from '../state/useNotifications';

export function NotificationHost() {
  const { current, dismiss } = useNotices();

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, dismiss]);

  if (!current) return null;
  const tone = current.tone === 'penalty' ? 'var(--penalty)' : 'var(--system)';

  return (
    <div className="notif" role="dialog" aria-modal="true" aria-label={current.kind}
         style={{ ['--nc' as string]: tone }}>
      <div className="notif__scrim" onClick={dismiss} />
      <div className="notif__stage">
        <div className="notif__rail notif__rail--top" />
        <div className="notif__panel">
          <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
          <div className="notif__head">
            <span className="notif__bang" aria-hidden="true">!</span>
            <span className="notif__kind">{current.kind}</span>
            <button className="notif__x" onClick={dismiss} aria-label="Dismiss">✕</button>
          </div>
          <div className="notif__body">
            {current.huge && <p className="notif__huge">{current.huge}</p>}
            {current.lead && <p className="notif__lead">{current.lead}</p>}
            {current.deltas && current.deltas.length > 0 && (
              <div className="notif__deltas">
                {current.deltas.map((d, i) => (
                  <span key={i} className="delta"
                        style={{ ['--k' as string]: d.color ?? tone }}>{d.text}</span>
                ))}
              </div>
            )}
            {current.fine && <p className="notif__fine">{current.fine}</p>}
          </div>
        </div>
        <div className="notif__rail notif__rail--bot" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Fire notices from the system on quest clear, level up, rank, and titles**

In `SystemContext.tsx`, extend `tickHabit` so that after `reload()` it compares before/after state and pushes notices. Add these imports and replace the `tickHabit` body:

```tsx
import { useNotify } from './useNotifications';
import { award } from '../data/xpEvents';
import { unlockTitle } from '../data/titles';
import { evaluateTitles, emptyTitleContext } from '../system/titles';
import { isDayCleared } from '../system/derive';
import { DOMAIN_COLOR, DOMAIN_OF, STAT_KEYS } from '../types';
import { XP } from '../system/xp';
import { loadSnapshot } from '../data/snapshot';
import { rankFromLevel } from '../system/levels';

// inside SystemProvider:
const notify = useNotify();

const tickHabit = useCallback(async (habit: Habit, count: number) => {
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
  for (const t of evaluateTitles(ctx, unlocked)) {
    await unlockTitle(t.code);
    notify({
      kind: 'TITLE ACQUIRED', huge: t.name.toUpperCase(),
      lead: t.detail, fine: 'Equipped automatically. Visible on your status window.',
    });
  }
}, [today, index, player, notify]);
```

Add this helper at module scope in `SystemContext.tsx`:

```tsx
function countLogsByDomain(habits: Habit[], logs: HabitLog[]): Record<Domain, number> {
  const byId = new Map(habits.map((h) => [h.id, h.domain] as const));
  const out = Object.fromEntries(DOMAINS.map((d) => [d, 0])) as Record<Domain, number>;
  for (const l of logs) {
    const d = byId.get(l.habit_id);
    if (d) out[d] += 1;
  }
  return out;
}
```

(Import `DOMAINS`, `type Domain`, `type HabitLog` alongside the existing type imports.)

- [ ] **Step 4: Mount the providers and host**

`hq-app/src/App.tsx`:

```tsx
<AuthGate>
  <NotificationProvider>
    <SystemProvider>
      <Shell><Routed /></Shell>
      <NotificationHost />
    </SystemProvider>
  </NotificationProvider>
</AuthGate>
```

`NotificationProvider` must sit **outside** `SystemProvider` — `SystemContext` calls `useNotify()`.

- [ ] **Step 5: Copy the notification CSS**

Copy `.notif`, `.notif__scrim`, `.notif__stage`, `@keyframes snap`, `@keyframes fade`, `.notif__rail`, `.notif__panel`, `.notif__head`, `.notif__bang`, `.notif__kind`, `.notif__x`, `.notif__body`, `.notif__lead`, `.notif__huge`, `.notif__deltas`, `.delta`, and `.notif__fine` **verbatim from the mockup** into `system.css`.

- [ ] **Step 6: Verify the cascade**

Run: `cd hq-app && npm run dev`

Expected:
1. Tick all seven objectives. On the last one, QUEST CLEARED snaps in.
2. Dismiss it — if the bonus crossed a level boundary, LEVEL UP follows immediately from the queue rather than being lost.
3. `select kind, amount from hq.xp_events where occurred_on = current_date;` shows exactly one `quest_bonus` row. Untick and re-tick a habit: still exactly one.

- [ ] **Step 7: Commit**

```bash
git add hq-app/src/state/useNotifications.tsx hq-app/src/ui/NotificationHost.tsx \
        hq-app/src/state/SystemContext.tsx hq-app/src/App.tsx hq-app/src/ui/system.css
git commit -m "feat(hq): queued NOTIFICATION panels for quest, level, rank, and titles"
```

---

### Task 17: Penalty evaluation on load

**Files:**
- Modify: `hq-app/src/state/SystemContext.tsx`
- Create: `hq-app/src/system/catchup.ts`
- Test: `hq-app/src/system/catchup.test.ts`

**Interfaces:**
- Consumes: `evaluatePenalties` from `./penalties`; `clampPenalty`, `XP` from `./xp`; `playerTotal` from `./xp`.
- Produces: `planCatchup(input: CatchupInput): CatchupPlan` — pure, so the EXP-floor behaviour is testable without a database. `CatchupPlan = { penalties: Array<{ date: string; missedHabitIds: string[]; xpLost: number }> }`.

- [ ] **Step 1: Write the failing test**

`hq-app/src/system/catchup.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { planCatchup } from './catchup';
import { buildLogIndex } from './streaks';
import { cumulativeXpFor, levelFromXp } from './levels';
import type { Habit } from '../types';

const habit = (id: string): Habit => ({
  id, name: id, domain: 'physical', cadence: 'daily', weekdays: null,
  target_per_week: null, target_count: 1, xp_value: 25, sort_order: 0, archived_at: null,
});

describe('planCatchup', () => {
  it('plans one penalty per missed day', () => {
    const plan = planCatchup({
      fromDate: '2026-08-29', throughDate: '2026-08-30',
      habits: [habit('a')], index: buildLogIndex([]),
      alreadyPenalized: new Set(), totalXp: cumulativeXpFor(14) + 500,
    });
    expect(plan.penalties.map((p) => p.date)).toEqual(['2026-08-29', '2026-08-30']);
    expect(plan.penalties.every((p) => p.xpLost === 40)).toBe(true);
  });

  // The invariant, applied across a multi-day gap: a two-week vacation must
  // not delevel the player.
  it('clamps cumulatively so a long gap never costs a level', () => {
    const start = cumulativeXpFor(14) + 60; // only 60 xp of headroom
    const plan = planCatchup({
      fromDate: '2026-08-17', throughDate: '2026-08-30', // 14 days
      habits: [habit('a')], index: buildLogIndex([]),
      alreadyPenalized: new Set(), totalXp: start,
    });
    const totalLost = plan.penalties.reduce((s, p) => s + p.xpLost, 0);
    expect(totalLost).toBe(60);
    expect(levelFromXp(start - totalLost)).toBe(14);
  });

  it('plans nothing when there is no headroom at all', () => {
    const plan = planCatchup({
      fromDate: '2026-08-29', throughDate: '2026-08-30',
      habits: [habit('a')], index: buildLogIndex([]),
      alreadyPenalized: new Set(), totalXp: cumulativeXpFor(14),
    });
    expect(plan.penalties.every((p) => p.xpLost === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hq-app && npx vitest run src/system/catchup.test.ts`
Expected: FAIL — cannot resolve `./catchup`.

- [ ] **Step 3: Write the implementation**

`hq-app/src/system/catchup.ts`:

```ts
import type { Habit } from '../types';
import { evaluatePenalties } from './penalties';
import { XP, clampPenalty } from './xp';

export interface CatchupInput {
  fromDate: string;
  throughDate: string;
  habits: ReadonlyArray<Habit>;
  index: Map<string, number>;
  alreadyPenalized: ReadonlySet<string>;
  totalXp: number;
}

export interface CatchupPlan {
  penalties: Array<{ date: string; missedHabitIds: string[]; xpLost: number }>;
}

/**
 * Turns missed days into a list of penalties, applying the EXP floor
 * CUMULATIVELY — a two-week absence drains the current level's surplus and
 * then stops, rather than deleveling the player fourteen times over.
 */
export function planCatchup(input: CatchupInput): CatchupPlan {
  const missed = evaluatePenalties(input);
  let running = input.totalXp;

  const penalties = missed.map((m) => {
    const applied = clampPenalty(running, XP.penalty); // negative or zero
    running += applied;
    // Math.abs, not -applied: negating a literal 0 yields -0, which reaches
    // the DB's xp_lost column and any toBe(0) assertion as a distinct value.
    return { date: m.date, missedHabitIds: m.missedHabitIds, xpLost: Math.abs(applied) };
  });

  return { penalties };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hq-app && npx vitest run src/system/catchup.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Wire catch-up into the provider's first load**

In `SystemContext.tsx`, after the first successful `loadSnapshot()`, run catch-up once per session:

```tsx
import { planCatchup } from '../system/catchup';
import { recordPenalty } from '../data/penalties';
import { addDays } from '../system/dates';
import { playerTotal } from '../system/xp';

async function runCatchup(snap: Snapshot, today: string): Promise<boolean> {
  const earliest = snap.logs.map((l) => l.log_date).sort()[0]
    ?? addDays(today, -1);
  const plan = planCatchup({
    fromDate: earliest,
    throughDate: addDays(today, -1),   // never penalize today; it is still live
    habits: snap.habits,
    index: buildLogIndex(snap.logs),
    alreadyPenalized: new Set(snap.penalties.map((p) => p.penalty_date)),
    totalXp: playerTotal(snap.events),
  });
  if (plan.penalties.length === 0) return false;

  for (const p of plan.penalties) {
    await recordPenalty({
      penalty_date: p.date, missed_habit_ids: p.missedHabitIds,
      xp_lost: p.xpLost, streak_before: 0,
    });
    if (p.xpLost > 0) {
      await award({ amount: -p.xpLost, kind: 'penalty', occurredOn: p.date });
    }
  }
  return true;
}
```

Call it in the provider's mount effect, and if it returns `true`, reload and push one summarising notice:

```tsx
useEffect(() => {
  let cancelled = false;
  (async () => {
    const snap = await loadSnapshot();
    if (cancelled) return;
    const changed = await runCatchup(snap, today);
    const fresh = changed ? await loadSnapshot() : snap;
    if (cancelled) return;
    setSnapshot(fresh);
    if (changed) {
      const lost = fresh.penalties.reduce((s, p) => s + p.xp_lost, 0);
      notify({
        tone: 'penalty', kind: 'PENALTY', huge: 'QUEST FAILED',
        lead: 'Days passed with the daily quest uncompleted. The streak has been severed.',
        deltas: [{ text: `−${lost} EXP` }, { text: 'STREAK → 0' }],
        fine: 'One missed day is data, not a verdict. Clear today to begin again.',
      });
    }
  })().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  return () => { cancelled = true; };
}, [today, notify]);
```

**Note:** this replaces the simple `void reload()` mount effect from Task 13. Keep `reload` for post-mutation refreshes.

- [ ] **Step 6: Verify catch-up is idempotent**

Run: `cd hq-app && npm run dev`

Expected: on first load after a gap, one PENALTY panel appears. **Reload the page — no second penalty fires**, and `select count(*) from hq.penalties;` is unchanged. That idempotence is the whole point of the `alreadyPenalized` set.

- [ ] **Step 7: Commit**

```bash
git add hq-app/src/system/catchup.ts hq-app/src/system/catchup.test.ts \
        hq-app/src/state/SystemContext.tsx
git commit -m "feat(hq): idempotent penalty catch-up with cumulative EXP floor"
```

---

### Task 18: Domain screens — goals, milestones, habits, tasks

**Files:**
- Create: `hq-app/src/data/goals.ts`, `hq-app/src/data/tasks.ts`, `hq-app/src/screens/DomainScreen.tsx`, `hq-app/src/ui/GoalCard.tsx`, `hq-app/src/ui/HabitEditor.tsx`, `hq-app/src/ui/TaskList.tsx`
- Modify: `hq-app/src/App.tsx`, `hq-app/src/ui/system.css`

**Interfaces:**
- Consumes: `useSystem()`, `useNotify()`, `streakFor`.
- Produces: `<DomainScreen domain />`; data functions `listGoals`, `createGoal`, `completeGoal`, `listMilestones`, `toggleMilestone`, `listTasks`, `createTask`, `completeTask`, `toggleFocus`.

- [ ] **Step 1: Write the goals data module**

`hq-app/src/data/goals.ts`:

```ts
import { supabase } from '../supabaseClient';
import type { Goal, Milestone } from '../types';

export async function listGoals(): Promise<Goal[]> {
  const { data, error } = await supabase.from('goals').select('*').order('target_date');
  if (error) throw error;
  return data as Goal[];
}

export async function listMilestones(): Promise<Milestone[]> {
  const { data, error } = await supabase.from('milestones').select('*').order('sort_order');
  if (error) throw error;
  return data as Milestone[];
}

export async function createGoal(g: Omit<Goal, 'id' | 'completed_at'>): Promise<Goal> {
  const { data, error } = await supabase.from('goals').insert(g).select().single();
  if (error) throw error;
  return data as Goal;
}

export async function createMilestone(m: Omit<Milestone, 'id' | 'done_at'>): Promise<void> {
  const { error } = await supabase.from('milestones').insert(m);
  if (error) throw error;
}

export async function setMilestoneDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase
    .from('milestones').update({ done_at: done ? new Date().toISOString() : null }).eq('id', id);
  if (error) throw error;
}

export async function completeGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals')
    .update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
```

`hq-app/src/data/tasks.ts`:

```ts
import { supabase } from '../supabaseClient';
import type { Task } from '../types';

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks').select('*').eq('status', 'open').order('due_date', { nullsFirst: false });
  if (error) throw error;
  return data as Task[];
}

export async function createTask(t: Omit<Task, 'id' | 'completed_at' | 'status'>): Promise<void> {
  const { error } = await supabase.from('tasks').insert({ ...t, status: 'open' });
  if (error) throw error;
}

export async function completeTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function setFocus(id: string, is_focus: boolean): Promise<void> {
  const { error } = await supabase.from('tasks').update({ is_focus }).eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: Extend the snapshot to carry goals, milestones, and tasks**

In `snapshot.ts`, add `goals`, `milestones`, and `tasks` to the `Snapshot` interface and to the `Promise.all`, importing from the two new modules. Every consumer reads them off the same snapshot, so nothing else needs its own fetch.

- [ ] **Step 3: Write the domain screen**

`hq-app/src/screens/DomainScreen.tsx`:

```tsx
import { Frame } from '../ui/Frame';
import { GoalCard } from '../ui/GoalCard';
import { TaskList } from '../ui/TaskList';
import { HabitEditor } from '../ui/HabitEditor';
import { useSystem } from '../state/SystemContext';
import { DOMAIN_COLOR, DOMAIN_LABEL, STAT_OF, type Domain } from '../types';
import { statProgress } from '../system/stats';
import { streakFor } from '../system/streaks';

export function DomainScreen({ domain }: { domain: Domain }) {
  const { snapshot, player, index, today } = useSystem();
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
      </Frame>

      <Frame title="Habits" meta={`${habits.length} TRACKED`}>
        {habits.map((h) => (
          <div className="habit-row" key={h.id}>
            <span className="habit-row__name">{h.name}</span>
            <span className="habit-row__streak">
              {streakFor(h, index, today)} DAY STREAK
            </span>
          </div>
        ))}
        <HabitEditor domain={domain} />
      </Frame>

      <Frame title="Backlog" meta={`${tasks.length} OPEN`}>
        <TaskList domain={domain} tasks={tasks} />
      </Frame>
    </div>
  );
}
```

- [ ] **Step 4: Write GoalCard, TaskList, and HabitEditor**

`GoalCard` renders the goal title, target date, a progress bar computed as `milestones.filter(done).length / milestones.length`, and a checkbox per milestone that calls `setMilestoneDone` then awards `XP.milestone` via `award({ amount: XP.milestone, kind: 'milestone', domain, refId: milestone.id, occurredOn: today })` and calls `reload()`. When the last milestone completes, call `completeGoal`, award `XP.goal`, and push a `TITLE ACQUIRED`-styled notice with `kind: 'QUEST COMPLETE'`.

`TaskList` renders open tasks with a star toggle for `is_focus` (max three focused — disable the toggle when three are already focused and this one is not) and a complete button that calls `completeTask`, awards `XP.focusTask` when `is_focus` else `XP.task`, and reloads.

`HabitEditor` is a single-row form: name text input, a cadence `<select>` (`daily` / `weekdays` / `n_per_week`), conditional weekday checkboxes or a per-week number, a target-count number input (default 1), an EXP number input (default `XP.habitDefault`), and an "Add habit" button calling `createHabit` with `domain` and `sort_order: habits.length * 10`.

Each of these is a small presentational component; keep them under 120 lines and take all data through props plus `useSystem()`.

- [ ] **Step 5: Route to it**

In `App.tsx`, change the `domain` case to `<DomainScreen domain={route.domain} />`.

- [ ] **Step 6: Verify**

Run: `cd hq-app && npm run dev`

Expected: each of the six rail entries opens its domain page showing that domain's stat progress, its seeded habits with live streaks, and empty goal/backlog panels. Adding a habit makes it appear on STATUS's Daily Quest the same day when it is due. Adding a goal with two milestones and ticking both marks the goal complete and awards 150 + 150 + 500 EXP.

- [ ] **Step 7: Commit**

```bash
git add hq-app/src/data/goals.ts hq-app/src/data/tasks.ts hq-app/src/data/snapshot.ts \
        hq-app/src/screens/DomainScreen.tsx hq-app/src/ui/GoalCard.tsx \
        hq-app/src/ui/TaskList.tsx hq-app/src/ui/HabitEditor.tsx \
        hq-app/src/App.tsx hq-app/src/ui/system.css
git commit -m "feat(hq): domain screens with goals, milestones, habits, and backlog"
```

---

### Task 19: Journal capture and focus tasks on STATUS

**Files:**
- Create: `hq-app/src/data/journal.ts`, `hq-app/src/ui/JournalCapture.tsx`, `hq-app/src/ui/FocusTasks.tsx`
- Modify: `hq-app/src/screens/Status.tsx`, `hq-app/src/data/snapshot.ts`, `hq-app/src/ui/system.css`

**Interfaces:**
- Consumes: `useSystem()`, `XP` from `../system/xp`.
- Produces: `<JournalCapture />`, `<FocusTasks />`; data functions `getEntry(date)`, `upsertEntry(entry)`, `listEntries()`.

- [ ] **Step 1: Write the journal data module**

`hq-app/src/data/journal.ts`:

```ts
import { supabase } from '../supabaseClient';
import type { JournalEntry } from '../types';

export async function listEntries(): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('entry_date, body, mood, energy, lesson')
    .order('entry_date', { ascending: false });
  if (error) throw error;
  return data as JournalEntry[];
}

export async function upsertEntry(entry: JournalEntry): Promise<void> {
  const { error } = await supabase
    .from('journal_entries').upsert(entry, { onConflict: 'entry_date' });
  if (error) throw error;
}
```

Add `journal: JournalEntry[]` to `Snapshot` and to the `Promise.all` in `snapshot.ts`.

- [ ] **Step 2: Write the capture component**

`hq-app/src/ui/JournalCapture.tsx`:

```tsx
import { useState } from 'react';
import { Frame } from './Frame';
import { useSystem } from '../state/SystemContext';
import { upsertEntry } from '../data/journal';
import { award } from '../data/xpEvents';
import { XP } from '../system/xp';

export function JournalCapture() {
  const { snapshot, today, reload } = useSystem();
  const existing = snapshot.journal.find((e) => e.entry_date === today);
  const [body, setBody] = useState(existing?.body ?? '');
  const [mood, setMood] = useState<number>(existing?.mood ?? 3);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!body.trim()) return;
    setSaving(true);
    const isNew = !existing;
    await upsertEntry({ entry_date: today, body: body.trim(), mood, energy: null, lesson: null });
    if (isNew) await award({ amount: XP.journal, kind: 'journal', occurredOn: today });
    await reload();
    setSaving(false);
  }

  return (
    <Frame title="Log" meta={existing ? 'RECORDED' : `+${XP.journal} EXP`}>
      <div className="journal">
        <label className="journal__label" htmlFor="j-body">
          What happened today, and what did it teach you?
        </label>
        <textarea id="j-body" className="journal__input" rows={4}
                  value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="journal__foot">
          <div className="journal__mood" role="group" aria-label="Mood">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button"
                      className={`mood ${mood === n ? 'mood--on' : ''}`}
                      aria-pressed={mood === n} onClick={() => setMood(n)}>{n}</button>
            ))}
          </div>
          <button className="btn" disabled={saving || !body.trim()} onClick={() => void save()}>
            {saving ? 'Recording…' : existing ? 'Update' : 'Record'}
          </button>
        </div>
      </div>
    </Frame>
  );
}
```

- [ ] **Step 3: Write FocusTasks**

`<FocusTasks />` renders up to three `is_focus` open tasks in a `Frame` titled "Top 3", each with its domain chip and a complete button that awards `XP.focusTask` and reloads. When fewer than three are focused, show a muted "Pick focus tasks from a domain page." line rather than an empty panel.

- [ ] **Step 4: Add both to Status**

```tsx
export function Status() {
  return (
    <>
      <PlayerCard />
      <div className="status__col">
        <DailyQuest />
        <FocusTasks />
        <JournalCapture />
      </div>
    </>
  );
}
```

Add to `system.css`:

```css
.status__col { display: flex; flex-direction: column; gap: var(--s5); min-width: 0; }
```

- [ ] **Step 5: Verify**

Run: `cd hq-app && npm run dev`

Expected: writing a log and pressing Record awards 20 EXP once; editing the same day's entry and pressing Update awards nothing further (`select count(*) from hq.xp_events where kind='journal' and occurred_on=current_date;` stays at 1).

- [ ] **Step 6: Commit**

```bash
git add hq-app/src/data/journal.ts hq-app/src/ui/JournalCapture.tsx \
        hq-app/src/ui/FocusTasks.tsx hq-app/src/screens/Status.tsx \
        hq-app/src/data/snapshot.ts hq-app/src/ui/system.css
git commit -m "feat(hq): daily journal capture and top-3 focus tasks"
```

---

### Task 20: BODY RECORD — progress photos

**Files:**
- Create: `hq-app/src/data/photos.ts`, `hq-app/src/system/resize.ts`, `hq-app/src/screens/BodyRecord.tsx`, `hq-app/src/ui/PhotoCompare.tsx`
- Modify: `hq-app/src/App.tsx`, `hq-app/src/data/snapshot.ts`, `hq-app/src/ui/system.css`

**Interfaces:**
- Consumes: `supabase` storage; `useSystem()`; `XP` from `../system/xp`.
- Produces: `resizeImage(file: File, maxEdge: number, quality: number): Promise<Blob>`, `uploadPhoto(input)`, `signedUrlFor(path)`, `deletePhoto(id, path)`, `<BodyRecord />`, `<PhotoCompare photos />`.

- [ ] **Step 1: Write the resizer**

Uploading a 12MP phone photo over cellular is the difference between a habit you keep and one you don't. Resize before upload, always.

`hq-app/src/system/resize.ts`:

```ts
/**
 * Downscale to fit within `maxEdge` and re-encode as JPEG. Runs entirely in
 * the browser so a 12MP phone photo becomes a ~300KB upload.
 */
export async function resizeImage(
  file: File, maxEdge = 1600, quality = 0.82,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare the image for upload.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Could not encode the image.');
  return blob;
}
```

- [ ] **Step 2: Write the photo data module**

`hq-app/src/data/photos.ts`:

```ts
import { supabase } from '../supabaseClient';
import { resizeImage } from '../system/resize';
import type { Pose, ProgressPhoto } from '../types';

const BUCKET = 'hq-photos';

export async function listPhotos(): Promise<ProgressPhoto[]> {
  const { data, error } = await supabase
    .from('progress_photos').select('*').order('taken_on', { ascending: false });
  if (error) throw error;
  return data as ProgressPhoto[];
}

export interface UploadInput {
  file: File;
  takenOn: string;
  pose: Pose;
  weightLb?: number | null;
  bodyfatPct?: number | null;
  note?: string | null;
}

export async function uploadPhoto(input: UploadInput): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error('Not signed in.');

  const blob = await resizeImage(input.file);
  const path = `${uid}/${input.takenOn}-${input.pose}-${crypto.randomUUID()}.jpg`;

  const up = await supabase.storage.from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (up.error) throw up.error;

  const { error } = await supabase.from('progress_photos').insert({
    taken_on: input.takenOn, pose: input.pose, storage_path: path,
    weight_lb: input.weightLb ?? null, bodyfat_pct: input.bodyfatPct ?? null,
    note: input.note ?? null,
  });
  if (error) {
    // Do not leave an orphaned object behind if the row insert fails.
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
}

/** Photos are private objects; they are only ever read through signed URLs. */
export async function signedUrlFor(path: string, seconds = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET).createSignedUrl(path, seconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function deletePhoto(id: string, path: string): Promise<void> {
  const { error } = await supabase.from('progress_photos').delete().eq('id', id);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([path]);
}
```

Add `photos: ProgressPhoto[]` to `Snapshot` and the `Promise.all` in `snapshot.ts`.

- [ ] **Step 3: Write the BodyRecord screen**

`BodyRecord` renders:
- A **capture panel**: `<input type="file" accept="image/*" capture="environment">` (so a phone opens the camera), a date input defaulting to `todayISO()`, a pose `<select>` (front/side/back/other), optional weight and body-fat number inputs, and an Upload button. On success, award `XP.photo` via `award({ amount: XP.photo, kind: 'photo', domain: 'physical', occurredOn: takenOn })`, reload, and push a notice `{ kind: 'RECORD UPDATED', huge: 'BODY RECORD', lead: 'Progress photo archived.' }`.
- A **timeline**: photos grouped by `taken_on` descending, each thumbnail loaded through `signedUrlFor`. Because signed URLs expire, resolve them in a `useEffect` into a `Map<string, string>` keyed by storage path and re-resolve on mount, never store them.
- `<PhotoCompare />`: two `<select>` dropdowns of available dates, rendering the chosen photos side by side with their weight and date captions beneath. Default the left select to the earliest photo and the right to the latest — the comparison people actually want is first versus now.

Keep the screen under 200 lines by putting the compare view in `PhotoCompare.tsx`.

- [ ] **Step 4: Route to it**

In `App.tsx`, change the `body` case to `<BodyRecord />`.

- [ ] **Step 5: Verify the full photo round-trip**

Run: `cd hq-app && npm run dev`

Expected:
1. Uploading a photo from a phone camera succeeds and appears in the timeline.
2. In Supabase → Storage → `hq-photos`, the object exists under `{uid}/…` and the bucket is **not** public.
3. Pasting the object's non-signed public URL into a private browser window returns an error — confirming the photos are genuinely private.
4. `select count(*) from hq.xp_events where kind='photo';` is 1, and STR gained 30 EXP.

- [ ] **Step 6: Commit**

```bash
git add hq-app/src/data/photos.ts hq-app/src/system/resize.ts \
        hq-app/src/screens/BodyRecord.tsx hq-app/src/ui/PhotoCompare.tsx \
        hq-app/src/data/snapshot.ts hq-app/src/App.tsx hq-app/src/ui/system.css
git commit -m "feat(hq): body record with client-resized private progress photos"
```

---

### Task 21: PWA, desktop shortcut, deploy, and docs

**Files:**
- Create: `hq-app/public/manifest.webmanifest`, `hq-app/public/icon-192.png`, `hq-app/public/icon-512.png`, `hq-app/public/icon-maskable.png`, `docs/hq-setup.md`, `scripts/make-hq-shortcut.sh`
- Modify: `hq-app/index.html`

**Interfaces:**
- Consumes: the finished app.
- Produces: an installable PWA, a Desktop shortcut, a committed `hq/` build, and a setup document.

- [ ] **Step 1: Write the manifest**

`hq-app/public/manifest.webmanifest`:

```json
{
  "name": "HQ // SYSTEM",
  "short_name": "HQ",
  "start_url": "/hq/",
  "scope": "/hq/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#04070f",
  "theme_color": "#04070f",
  "icons": [
    { "src": "/hq/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/hq/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/hq/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Link it in `hq-app/index.html` inside `<head>`:

```html
<link rel="manifest" href="/hq/manifest.webmanifest" />
<link rel="apple-touch-icon" href="/hq/icon-192.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

- [ ] **Step 2: Generate the icons**

Draw a 512×512 System glyph — a cyan `#5ad8ff` bracketed diamond on the `#04070f` void, matching the corner-bracket language — and export at 192, 512, and a maskable 512 with 20% safe-area padding. Use any tool; commit the three PNGs to `hq-app/public/`.

- [ ] **Step 3: Write the desktop shortcut script**

`scripts/make-hq-shortcut.sh`:

```bash
#!/usr/bin/env bash
# Places an HQ shortcut on the macOS Desktop. Re-runnable.
set -euo pipefail

DEST="$HOME/Desktop/HQ.webloc"
cat > "$DEST" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>URL</key>
  <string>https://www.heyspence.me/hq/</string>
</dict>
</plist>
PLIST

echo "Created $DEST"
echo "For a real dock app instead: open https://www.heyspence.me/hq/ in Chrome,"
echo "then ⋮ → Cast, save and share → Install page as app."
```

Run: `chmod +x scripts/make-hq-shortcut.sh && ./scripts/make-hq-shortcut.sh`
Expected: `HQ.webloc` appears on the Desktop and opens `/hq/`.

- [ ] **Step 4: Write the setup doc**

`docs/hq-setup.md`, following the shape of `docs/job-board-setup.md`: architecture, what was done, the three manual Google/Supabase steps, local development commands, and the rebuild-and-commit workflow (`cd hq-app && npm run build` writes to `../hq`, then commit `hq/`).

- [ ] **Step 5: Full verification before deploy**

Run, in order:

```bash
cd hq-app
npm test          # expect: all suites pass
npm run build     # expect: tsc clean, output written to ../hq
```

Then `npx vite preview --base /hq/` and confirm the production build signs in, ticks a habit, and fires a notification.

- [ ] **Step 6: Commit and deploy**

```bash
cd "/Users/quinnkb/Desktop/Dev Projects/heyspence.me"
git add hq hq-app/public hq-app/index.html docs/hq-setup.md scripts/make-hq-shortcut.sh
git commit -m "feat(hq): PWA manifest, desktop shortcut, production build, setup docs"
git checkout main && git merge hq-system && git push
```

Expected: Netlify deploys, `https://www.heyspence.me/hq/` prompts for Google sign-in, and the Daily Quest renders. Install to the iPhone home screen via Share → Add to Home Screen.

- [ ] **Step 7: Verify in production**

- `https://www.heyspence.me/hq/` signs in with Google and shows the status window.
- A deep link (`https://www.heyspence.me/hq/physical`) loads directly, proving the Netlify rewrite.
- `https://www.heyspence.me/jobs` and `/repairs` still work — the rewrite ordering did not break them.
- The phone home-screen icon launches standalone with no browser chrome.

---

## Self-Review

**Spec coverage.** Six domains → Task 2, 9. Google auth → Task 11. XP ledger → Tasks 9, 13. Level/rank/stat math → Tasks 4, 5. Daily Quest → Task 15. Penalties with EXP floor → Tasks 5, 17. Titles → Tasks 8, 16. NOTIFICATION → Task 16. STATUS → Tasks 14, 15, 19. Domain pages → Task 18. Journal → Task 19. BODY RECORD → Task 20. Storage privacy → Tasks 10, 20. Visual system → Task 12. PWA + shortcut → Task 21. Testing → every system task. **GRID and REVIEW are deliberately absent — they are Phase 2 and get their own plan.**

**Type consistency.** `Habit`, `HabitLog`, `XpEvent`, `Snapshot`, `PlayerState`, `SystemNotice`, `TitleContext`, `CatchupPlan` are each defined once and imported everywhere. `buildLogIndex`/`logKey`/`isDueOn`/`isMetOn`/`streakFor` keep the same signatures from Task 6 through Task 18. `award()` takes `occurredOn` (camelCase) at the call site and writes `occurred_on` to the DB in one place, Task 13.

**Known deviation.** Task 8 defines titles against domain log counts rather than named habits, because habits are renameable. Same intent, documented in the task.
