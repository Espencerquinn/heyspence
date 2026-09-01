# HQ — "The System" Design Spec

**Date:** 2026-08-31
**Goal:** A private, gamified productivity and personal-development tracker at `heyspence.me/hq`, gated behind Google sign-in, that makes building habits feel like leveling a character in *Solo Leveling*.

## Context

- Static site at `/Users/quinnkb/Desktop/Dev Projects/heyspence.me`, repo `Espencerquinn/heyspence`, Netlify-deployed from `main`. Sub-apps (`ahs-online/`, `units/`, `jobs/`, `repairs/`) are committed build output served via `netlify.toml` rewrites.
- HQ follows the **`jobs-app` pattern exactly**: a Vite/React SPA in `hq-app/` that builds into a committed repo-root `hq/` folder, served by the existing Netlify site. No new Netlify site, no subdomain, no DNS.
- Backend is the **existing `heyspence` Supabase project** (`utvurjzrvnghbmzjrrhq`), with HQ's tables in a dedicated `hq` schema — the same isolation Case Hub uses with `case_hub`.
- Single user: `espencer.quinn@gmail.com`. Never multi-tenant.
- Approved visual mockup of the STATUS screen and NOTIFICATION panel:
  https://claude.ai/code/artifact/c7c1ae5b-5761-41d2-b7d3-39feda53a40e

## Decisions (locked)

- **Seven life domains, rendered as an RPG stat block.** This mapping is the core design idea: a neglected domain reads as a dump stat, which is a sharper motivator than a progress bar.

  | Domain | Stat | Color |
  |---|---|---|
  | Physical | `STR` | `#5ad8ff` cyan |
  | Intellectual | `INT` | `#7f9cff` periwinkle |
  | Spiritual | `WIS` | `#b28cff` violet |
  | Social | `CHA` | `#4fe3b0` mint |
  | Musical | `SENSE` | `#ff9ad5` magenta |
  | Financial | `FOR` | `#ffc46b` amber |
  | Marital | `BND` | `#ff7a6b` coral |

- **XP is an append-only ledger.** Levels and stats are *derived* from `hq.xp_events`, never stored as mutable counters. Tuning XP values later replays cleanly with no drift.
- **Auth: Google OAuth only.** Wired on the `heyspence` Supabase project (see Setup). No magic-link fallback in HQ.
- **Penalties sting, they don't punish.** Miss the Daily Quest → streak resets, −40 EXP, penalty quest tomorrow. **A penalty can never cost you a level** (EXP floors at the current level's threshold).
- **Single-theme dark.** A holographic System interface has no light mode.
- **Progress photos ship in Phase 1.** Day-one photos can't be taken retroactively.

## Architecture

```
hq-app/                     Vite + React 19 + TS source
  src/
    system/                 XP, levels, ranks, streaks, penalties, titles (pure, tested)
    data/                   Supabase queries, one module per table
    ui/                     Frame, Notification, StatBlock, ObjectiveRow, ...
    screens/                Status, Domain, Grid, BodyRecord, Review
    auth/AuthGate.tsx
hq/                         committed build output (vite base '/hq/', outDir '../hq')
hq-backend/supabase/        migrations for the hq schema
```

- **Routing:** minimal History-API router (~40 lines) over 11 routes. No `react-router` dependency for a single-user app this size.
- **Dependencies:** `react`, `react-dom`, `@supabase/supabase-js`. **No chart library** — the daily-progress bars, donut, and heatmap are simple enough in CSS/SVG.
- **Netlify:** add `/hq/*` → `/hq/index.html` rewrite **before** the catch-all in the root `netlify.toml`.

## Data model — `hq` schema

Domains are a Postgres enum so a typo can't create an eighth: `hq.domain = ('physical','intellectual','spiritual','social','musical','financial','marital')`.

| Table | Columns (essentials) |
|---|---|
| `habits` | `id`, `name`, `domain`, `cadence` (`daily`/`weekdays`/`n_per_week`), `weekdays int[]`, `target_per_week`, `target_count` (default 1, e.g. 10000 steps), `xp_value`, `sort_order`, `archived_at` |
| `habit_logs` | `habit_id`, `log_date`, `count`, `created_at` — **unique(`habit_id`,`log_date`)** |
| `goals` | `id`, `domain`, `title`, `detail`, `target_date`, `status`, `completed_at` |
| `milestones` | `goal_id`, `title`, `sort_order`, `done_at` |
| `tasks` | `id`, `domain`, `goal_id?`, `title`, `notes`, `due_date`, `is_focus`, `status`, `completed_at` |
| `journal_entries` | `entry_date` **unique**, `body`, `mood` 1–5, `energy` 1–5, `lesson` |
| `progress_photos` | `id`, `taken_on`, `pose` (`front`/`side`/`back`/`other`), `storage_path`, `weight_lb?`, `bodyfat_pct?`, `note` |
| `xp_events` | `id`, `domain?`, `amount`, `kind` (`habit`/`task`/`journal`/`milestone`/`goal`/`quest_bonus`/`penalty`), `ref_id`, `occurred_on`, `created_at` |
| `titles` | `code` **unique**, `unlocked_at` — definitions live in code, unlocks in the DB |
| `penalties` | `penalty_date` **unique**, `missed_habit_ids uuid[]`, `xp_lost`, `streak_before` |

**RLS:** every table gets `hq.is_owner()` — `auth.jwt() ->> 'email' = 'espencer.quinn@gmail.com'` — mirroring `is_job_owner()`. Enabled on all tables, `USING` and `WITH CHECK`.

**Storage:** private bucket `hq-photos`, same owner policy. Path `{uid}/{yyyy-mm-dd}-{pose}-{uuid}.jpg`. Client resizes to max 1600px / JPEG q0.82 before upload (fast on cellular, cheap to store). Display uses signed URLs with a 1-hour TTL — photos are never public objects.

## The System — game math

All of this lives in `src/system/` as pure functions with unit tests. This is where the bugs would otherwise hide.

**Player level.** EXP to advance from level *n*: `70n + 20`. Cumulative to reach level *n*: `(n-1)(35n + 20)`. Inverted for display:

```
level(total) = floor( (15 + sqrt(225 + 140 * (total + 20))) / 70 )
```

Clearing a full daily quest is ~305 EXP. Cumulative EXP to reach level 50 is 86,730, so a year of consistent play lands in the mid-50s — steady, never trivially maxed.

**Stat level.** Each domain levels off its own EXP pool, decelerating:

```
statLevel(domainXp) = floor( sqrt(domainXp / 12) )
```

≈80 days of daily effort in one domain to reach stat level 20.

**Rank bands.** `E` 1–9 · `D` 10–19 · `C` 20–34 · `B` 35–49 · `A` 50–69 · `S` 70+.

**EXP values.** Habit tick: `habit.xp_value` (default 25). Task: 15, focus task: 25. Journal entry: 20. Milestone: 150. Goal complete: 500. Progress photo: 30. Full daily-quest clear bonus: 100.

**Daily Quest.** Derived, never stored — it's the set of habits due today per their cadence. Full clear writes one `quest_bonus` event.

**Penalty evaluation.** Runs lazily on app load: for each date between the last evaluated day and yesterday, if the day had ≥1 due habit and any went unlogged, write a `penalties` row and a −40 `penalty` xp_event. **The negative event is clamped so total EXP never drops below the current level's threshold** — you can lose progress, never a level. Streak resets to 0. *(The 2x-target **penalty quest** is **descoped to Phase 2**; Phase 1 applies the EXP debt and streak reset only, and the UI must not promise otherwise.)*

**Titles (seed set).** *The Awakened* (first 7-day streak) · *Iron Will* (30-day streak) · *Monarch of Iron* (100 gym logs) · *Well-Read* (50 reading logs) · *Perfect Tempo* (30 practice sessions) · *The Devout* (30 spiritual logs) · *Beloved* (25 social objectives) · *Solvent* (60 straight days of expense logging) · *Two as One* (60 marital days) · *Balanced* (all seven stats ≥ 10) · *Shadow Sovereign* (all seven stats ≥ 20) · *Chronicler* (100 journal entries) · *The Persistent* (recover a streak within 2 days of a penalty).

**Notifications.** A queue, so a quest clear that also triggers a level-up shows both panels in sequence. Fired on: quest clear, level up, rank promotion, title unlock, penalty.

## Screens

1. **STATUS** — player card (name, level, rank, title, EXP bar, seven-stat block, streak) + Daily Quest objectives + top-3 focus tasks + a one-line journal capture.
2. **DOMAIN ×7** — that domain's goals → milestones, its habits with streaks, its task backlog, its stat history.
3. **GRID** — the month matrix: habits as rows, days as columns, tick cells, daily-progress bars above, and completed/left/% summary. *(Phase 2)*
4. **BODY RECORD** — progress photo timeline, capture from phone camera, and a before/after comparison of any two dates.
5. **REVIEW** — weekly digest: domain balance, streaks held and broken, journal excerpts. *(Phase 2)*

**Navigation:** left rail on desktop with the seven domains grouped under a `[ DOMAINS ]` label; on mobile a four-target bottom dock (Status · Domains · Grid · Body) where Domains opens a picker. Seven domains is far too many for a phone bottom bar — this is why.

## Visual system

Locked by the approved mockup.

- **Ground:** `--void #04070f` (blue-biased near-black), `--abyss #070d19`, panels `rgba(10,21,38,.72)`.
- **System cyan:** `--system #5ad8ff`; text `--ether #dff2ff`; secondary `--mute #6f8ba6`; `--penalty #ff4d6a`.
- **Type:** **Chakra Petch** for display and UI (bevelled corners echo the frame language); **JetBrains Mono** for all bracketed data — `[6420/10000]` must be mono; Chakra Petch italic for the System's proclamations.
- **Frames:** 1px cyan hairline + inner glow + four 13px corner brackets.
- **Motion:** NOTIFICATION snaps in with a scaleY bloom; EXP bars fill on a 0.7s ease; a canvas mote field drifts behind everything *(**descoped to Phase 2**; Phase 1 ships the static grille and vignette only)*. All of it respects `prefers-reduced-motion`.
- **Sound:** ~~WebAudio blips on tick, an arpeggio on level-up, a two-note drop on penalty.~~ **Descoped to Phase 2** — not built in Phase 1.

## Delivery

**PWA + shortcuts.** Web app manifest (standalone, `--void` theme color, maskable icon) so HQ installs to the iPhone home screen. On macOS: a `.webloc` on the Desktop with a custom System-blue `.icns`, plus Chrome's "Install" for a real dock app — both get set up, and the better one wins.

## Setup (manual, one-time)

1. **Google Cloud Console** → APIs & Services → Credentials → OAuth 2.0 Client ID (Web application). Authorized redirect URI: `https://utvurjzrvnghbmzjrrhq.supabase.co/auth/v1/callback`.
2. **Supabase** → `heyspence` → Authentication → Providers → Google → paste Client ID + Secret → enable.
3. **Supabase** → Auth → URL Configuration → add `https://www.heyspence.me/hq/` and `http://localhost:5173` to redirect URLs.

Steps 1–2 are Spencer's; the rest is automated.

## Phasing

**Phase 1 — The System (playable):** schema + RLS + Storage bucket · Google OAuth · app shell, router, design tokens · STATUS with quest/EXP/level/rank/NOTIFICATION · seven domain pages · BODY RECORD · titles + penalty evaluation · journal capture · PWA, desktop shortcut, deploy.

**Phase 2 — The Record:** GRID month matrix · REVIEW weekly digest · journal digest.

## Testing

Vitest over `src/system/` — the pure math is where correctness matters: level/rank inversion round-trips, stat-level curve, streak counting across cadence types, penalty evaluation over a synthetic date range, and the **EXP floor invariant** (no penalty sequence can ever reduce player level). UI is verified by running the app; no component-test harness for a single-user tool.

## Out of scope (YAGNI)

- Multi-user, sharing, social features, public profiles.
- Push notifications and reminders — the desktop/home-screen shortcut is the trigger.
- Weekly "rest tokens" / streak freezes. Considered and deferred; the EXP floor already keeps a bad week recoverable.
- Importing from Apple Health, Strava, or a bank. Habits are logged by hand — the tick *is* the ritual.
- Stat-point allocation as a real mechanic (the level-up panel names points; they're flavor, not a spend).
- Any change to `/jobs`, `/repairs`, `/units`, `/ahs-online`, or the root landing page. The only shared-file edit is the `netlify.toml` rewrite.
