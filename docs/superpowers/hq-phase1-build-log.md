# HQ Phase 1 — Build Log

The full subagent-driven-development ledger for the Phase 1 build: every task, every review
finding, and every ruling made during execution. Preserved from the (git-ignored) scratch
workspace because the rulings are the record of decisions taken on the owner's behalf.

```
# SDD ledger — plan: docs/superpowers/plans/2026-08-31-hq-system-phase1.md

Spec: docs/superpowers/specs/2026-08-31-hq-system-design.md (read, authoritative)
Branch: hq-system (isolated from main). Repo: heyspence.me
Supabase CLI: authenticated, `heyspence` (utvurjzrvnghbmzjrrhq) visible — T9/T10 run unattended.

## Pre-flight conflict scan

### Cross-task rows (tasks sharing a file or interface)

| Tasks | Shared surface | Produced vs consumed | Finding |
|---|---|---|---|
| T1 → T11,12,13,14,16,18,20 | `src/App.tsx` | T12 defines `Routed()` w/ status/domain/body cases; T14 replaces status, T18 replaces domain, T20 replaces body | clean — strictly sequential replacement |
| T1 → T12 | `src/main.tsx` | T12 adds two CSS imports | clean |
| T2 → all | `src/types.ts` | `Habit` fields consumed by T6 tests/impl, T13, T14, T15, T18 | clean — every field T6+ uses is defined in T2 |
| T13 → T18,19,20 | `src/data/snapshot.ts` | T13 `Snapshot` (5 fields); T18 adds goals/milestones/tasks, T19 adds journal, T20 adds photos | clean — purely additive, each consumer added in the same task |
| T13 → T16,17 | `src/state/SystemContext.tsx` | T16 replaces `tickHabit`; T17 replaces the mount effect | clean — T16's new imports listed; `derivePlayer`/`buildLogIndex` already imported by T13 |
| T13 → T15 | `tickHabit(habit, count)` | T15 calls `tickHabit(h, met ? 0 : h.target_count)` | clean — signature identical before and after T16 |
| T16 → T17 | `useNotify()` | T17's mount effect calls `notify(...)` | clean — T16 precedes T17 |
| T5 → T17 | `clampPenalty` sign convention | clampPenalty returns negative; planCatchup stores `xpLost` positive; T17 awards `-p.xpLost` | clean — signs reconcile |
| T9 → T13,16,19 | `xp_events` uniqueness | partial unique index covers `kind='habit'` only; quest_bonus/journal guarded in app code only | FINDING 1 — see rulings |
| T9 → T10 | `hq.is_owner()` | 0003 storage policies call it; 0002 defines it | clean — migration order correct |
| T3 → T6,7,13,17 | date helpers | `addDays`/`eachDay`/`weekStart`/`dayOfWeek`/`daysBetween` consumed exactly as defined | clean |
| T6 → T7,13,18 | `isDueOn`/`isMetOn`/`streakFor`/`buildLogIndex`/`logKey` | same signatures at every call site through T18 | clean |
| T12,14,15,16,18,19,20 | `src/ui/system.css` | additive rule blocks copied from the approved mockup | clean — no selector reuse across tasks; final review to confirm cascade |

### Per-task self-consistency rows

| Task | Own text agrees with itself? |
|---|---|
| T1 | yes — vitest `include: src/**/*.test.ts`; every test file authored is `.ts`, none `.tsx` |
| T2 | yes — all six colors are lowercase 6-digit hex, matching the test's regex |
| T3 | yes — 14 assertions all satisfied by the implementation shown |
| T4 | yes — closed form verified numerically before the plan was written (round-trips 1..120) |
| T5 | yes — `statXpFor(22)=5808` matches the test; `XP.penalty` positive matches `clampPenalty` negating |
| T6 | yes — `MAX_SCAN=400` matches the 400-day test; n_per_week "before today" logic matches both n_per_week tests |
| T7 | yes — 8 tests map 1:1 to the branches in `evaluatePenalties` |
| T8 | yes — title codes in tests all exist in `TITLE_DEFS` |
| T9 | yes, but see FINDING 1 |
| T10 | yes — `on conflict do nothing` without a target is valid PG |
| T11 | yes — manual prerequisite stated before the step that needs it |
| T12 | yes — router BASE derives from vite base `/hq/` set in T1 |
| T13 | yes — derive tests traced by hand against the implementation |
| T14 | yes — `idleDays` param type widens `Domain` to `string`, assignable |
| T15 | yes — `Number('20260831') % 7` is within safe-integer range |
| T16 | yes — providers ordered so `SystemContext` can call `useNotify()` |
| T17 | FINDING 2 — first-run behaviour |
| T18 | FINDING 3 — step 4 is prose, not code |
| T19 | FINDING 3 — `FocusTasks` is prose, not code |
| T20 | FINDING 3 — `BodyRecord` screen is prose, not code |
| T21 | FINDING 4 — "draw a 512x512 glyph" is not mechanically executable |

## Rulings (pre-flight)

Ruling: FINDING 1 — add a second partial unique index to T9's 0001_schema.sql,
`create unique index xp_events_daily_once_idx on hq.xp_events (kind, occurred_on) where kind in ('quest_bonus','journal');`
— app-level guards for the quest bonus and the journal award are the only thing preventing a
double-award today, and `award()` already swallows 23505 so the index is a free backstop.
Cost if wrong: none foreseeable — journal is one row per date by PK, and one quest bonus per day is the design.

Ruling: FINDING 2 — T17 must not penalize days before the player started.
Amend `runCatchup`: derive the start as the earliest of all log dates and event dates; if there are
none, return false and evaluate nothing. Without this, a brand-new install with seeded habits and zero
logs fires a PENALTY panel for yesterday on first sign-in — punishing the user for a day they did not
have the app. Requires an added test. Cost if wrong: catch-up skips a genuinely missed first day, which
is the strictly safer error.

Ruling: FINDING 3 — T18 step 4, T19 step 3, and T20 step 3 specify components in prose rather than
literal code. This is a plan defect but not a blocking one: each names its data calls, its XP award, and
its interaction contract. These three tasks are dispatched on a standard model rather than the cheap
tier, and their reviews carry the prose contract verbatim as the spec surface.
Cost if wrong: an extra fix round on those tasks.

Ruling: FINDING 4 — T21's icon step is not mechanically executable as written. Generate the three PNGs
from an inline SVG via a one-off `hq-app/scripts/make-icons.mjs` using `sharp` as a devDependency.
Cost if wrong: one dev-only dependency (~30MB) used once; removable after the PNGs are committed.

## Progress

Ruling: batching — the seven pure-math modules (T2-T8) are the same shape (one pure module + one
vitest suite, complete code given in the plan) and are dispatched as four batched units:
[T2+T3], [T4+T5], [T6+T7], [T8]. Each batch gets one implementer and one task review covering both
tasks. Reserves one-dispatch-per-task for work needing its own judgment.
Cost if wrong: a review finding in one half of a batch re-opens both halves.

Task 1: implemented (commit 2480453, DONE_WITH_CONCERNS — added `*.tsbuildinfo` to hq-app/.gitignore,
  not in brief; matches sibling jobs-app convention, prevents committing tsc build cache).
  npm test 1/1, npm run build OK, ../hq/index.html + assets present with /hq/ base.
  Review dispatched (sonnet) over 5a8117f1..2480453e.
Task 1: complete (commits 5a8117f..2480453, review clean — Spec ✅, quality Approved, 0 Critical/Important).
Task 1: minor (deferred): hq-app/.gitignore `*.tsbuildinfo` line lacks an explanatory comment (cosmetic).
Ruling: Task 1 minor — `npm run lint` was plan-mandated with no eslint dep or config anywhere in the
plan, so T21's lint verification step would have failed at the finish line. Removed the `lint` script
from T1's package.json, dropped `eslint.config.js` from the plan's file structure, and dropped the
`npm run lint` line from T21 step 5. `tsc -b` under strict + noUnusedLocals + noUnusedParameters already
covers what lint would catch on a single-user app. The already-committed hq-app/package.json still has
the script; removal is folded into the next implementer dispatch rather than hand-edited here.
Cost if wrong: no lint rules; adding ESLint later is a self-contained change.

SCOPE CHANGE (user, mid-execution): seventh domain `marital` — investing in his marriage.
Ruling: added as its own domain, not folded into `social`. Stat `BND` (Bond), color `#ff7a6b` coral.
Landed before T2 (types) and T9 (Postgres enum) were built, so it cost a text edit rather than a
migration. Amended: plan Global Constraints, T2 types+tests, T5 domainTotals test, T8 titles (+`two_as_one`,
Balanced/Sovereign now require seven), T9 enum, T10 seed (+2 marital habits), route count 10→11; spec
domain table, titles, screens, nav; and the approved mockup artifact. Briefs 2-8 regenerated.
Ruling: penalty panels render stat deltas in `--mute`, never a stat hue — BND coral sits near
`--penalty` red, and categorical hues must stay separate from semantic red. Applied to the mockup and
added to Global Constraints.
Cost if wrong: an eighth domain later needs a real enum migration; BND/penalty proximity is mitigated but not eliminated.
Tasks 2+3: implemented (commits 1968bc3 types, f8e32fb dates). 21/21 tests pass, output pristine.
  Lint-script removal folded in per ruling. Review dispatched (sonnet) over a3429a6c..f8e32fb2.
Tasks 2+3: complete (commits a3429a6..f8e32fb, review clean — Spec ✅, Approved, 0 Critical/Important).
Task 3: minor (deferred): `formatShort` exported but untested (gap in the brief itself).
Task 3: minor (deferred): the `todayISO` local-vs-UTC test only fails on a runner west of UTC; a
  toISOString()-based regression would pass it on a UTC/east runner. Implementation verified
  structurally correct (zero toISOString occurrences, local getters throughout). Dev machine is UTC-6
  so it protects in practice. Final review should triage whether to pin it with a mocked TZ.
Task 3: minor (deferred): task-3-brief says "14 tests", the literal test file has 15. Stale count in
  the brief text only; implementation and report both correct at 15.
Tasks 4+5: implemented (commits e695a54 levels, c9f68ab stats+xp). 50/50 tests pass, output pristine.
  500-penalty no-delevel invariant verified green. Review dispatched (sonnet) over f8e32fb2..c9f68ab7.
Tasks 4+5: complete (commits f8e32fb..c9f68ab, review Approved — 1 Important, ruled on below).
Ruling: T5 Important (plan-mandated) — the plan's LITERAL `clampPenalty` body
`return -Math.min(Math.abs(requested), room)` returns `-0` when room is 0, and Vitest's toBe uses
Object.is, where Object.is(-0,0) is false. The plan's own formula fails the plan's own boundary test.
The implementer's rewrite (`deducted > 0 ? -deducted : 0`) is numerically identical and correct — the
code stands, no rework. This is a defect I introduced in the plan, not implementer error. Amended the
plan's T5 source to the working form with a comment, and added a Global Constraint forbidding -0 in the
XP math. Also amended T17's `planCatchup` to use `Math.abs(applied)` rather than `-applied`, where the
same hazard would have propagated a negative zero into the xp_lost DB column.
Cost if wrong: none — the amendments match the code already committed and verified green.
Tasks 4+5: minor (deferred): implementer reported "Concerns: None" while having deviated from a
  mandated-verbatim formula; the deviation was disclosed only in an implementation-notes aside.
  Process observation for final triage, no code impact.
Tasks 6+7: implemented (commits 4d5cb47 streaks, 342dfb1 penalties). 73/73 pass, pristine.
  Review dispatched (sonnet) over 21ab78bf..342dfb1f.
Ruling: T6 Important (plan-mandated) — the plan's literal `streaks.ts` defines `countThisWeek` and then
never calls it (isDueOn's n_per_week branch reimplements the logic inline with DIFFERENT semantics:
inline excludes `date` itself, countThisWeek includes it). Under `noUnusedLocals: true`, `tsc -b` fails
with TS6133, exit 2 — `npm run build` is broken. Reviewer verified by running tsc directly.
Decision: DELETE `countThisWeek` rather than wire it in — the two semantics genuinely differ, and
inventing an excludeDate parameter for a single caller is API for no reason. Plan amended, brief 6
regenerated. Enters the fix loop as round 1.
Cost if wrong: none — deleting genuinely dead code cannot change behavior; tests already cover the inline path.
Ruling: PROCESS — vitest runs through esbuild and does NOT type-check, so every task so far could have
shipped type errors behind a green suite. Added a Global Constraint: every task verifies with
`npm run build` (tsc -b), not only `npm test`. Carried into all remaining dispatches.
Cost if wrong: a few seconds per task.
Tasks 6+7: fix round 1/5 (1 addressed, 0 open — dead countThisWeek deleted, imports still used,
  tsc/test/build all green; commits 342dfb1f..3f540e72).
Tasks 6+7: complete (commits 21ab78bf..3f540e72, review clean after 1 fix round).
Tasks 6+7: minor (deferred): dueHabitsOn filters !archived_at then isDueOn re-checks it (harmless,
  brief-verbatim). PenaltyInput.index is a mutable Map while alreadyPenalized is ReadonlySet —
  asymmetric readonly usage in the brief's own interface.
Task 8: implemented (commit f30ffcd titles). 83/83 pass, tsc clean, build succeeds.
  Review dispatched (sonnet) over 3f540e72..f30ffcd4.
Task 8: complete (commits 3f540e72..f30ffcd4, review clean — Spec ✅, Approved, 0 Critical/Important).
Task 8: minor (deferred): 7 of 13 titles have no direct test (well_read, perfect_tempo, the_devout,
  beloved, solvent, shadow_sovereign, the_persistent). Plan-mandated gap — the brief's own suite.
  shadow_sovereign (2nd all-seven gate) and the_persistent (only user of recoveredWithinDays) matter most.
Task 8: minor (deferred): report prose says "14 titles", TITLE_DEFS has 13. Cosmetic, code correct.

Ruling: PRODUCTION RISK caught before dispatch — T9 step 5 as written ran `supabase config push` from a
fresh hq-backend/config.toml. `config push` writes the WHOLE config, and the live project's auth settings
(site_url = https://www.heyspence.me/jobs/) were pushed from jobs-backend/supabase/config.toml. Pushing
from hq-backend would have overwritten them and broken sign-in for the existing job board.
Decision: drop `config push` entirely from this build. `supabase db push` still runs (additive DDL in a
new schema, touches neither public nor case_hub). Exposing the `hq` schema becomes a manual dashboard
step (Project Settings → API → Exposed schemas), batched with the user's Google OAuth work. Plan amended
in T9 step 2/5/6, T13 step 7, and Global Constraints.
Cost if wrong: one extra manual dashboard step for the user instead of an automated push.
Tasks 9+10: BLOCKED — Supabase project `heyspence` (utvurjzrvnghbmzjrrhq) is PAUSED. `supabase link`
  fails; controller independently confirmed the REST host does not resolve (curl exit 6, HTTP 000), which
  is how Supabase presents a paused project. Nothing reached the database.
  Migration files 0001-0004 + config.toml ARE written and committed (0ad61c3, dd8f914), transcribed
  verbatim, enum order verified against hq-app/src/types.ts. Only `supabase db push` is outstanding.
  NOTE: this also means heyspence.me/jobs and Case Hub are currently down — same project.
  Requires USER ACTION: unpause in the Supabase dashboard. Cannot be worked around.
Ruling: REORDER rather than stall. Tasks 11 (supabase client + AuthGate) and 12 (tokens, Frame, Rail,
  Shell, router) are dispatched CODE-ONLY — every file written and type-checked, with their live
  verification steps (T11 step 5 sign-in, T12 step 6 route check against real data) explicitly deferred
  to a single "backend bring-up" checkpoint after the unpause. Their code has no build-time dependency
  on a reachable database. Task 13 onward genuinely needs the DB and waits.
  Cost if wrong: the deferred verifications surface an integration bug later than they otherwise would,
  in code that is otherwise fully reviewed.
Tasks 11+12: implemented (commits 9948bcb auth, 545a95f shell). tsc clean, 83 tests, build OK.
  4 disclosed deviations: added vite-env.d.ts (my plan omitted it, needed for import.meta.env);
  anon key is a placeholder pending unpause; Rail adds only-desktop/only-mobile per the brief's prose
  (the brief's code sample omitted the mobile collapse); used the mockup's :root verbatim because my
  brief's inline CSS snippet was stale (missing --bnd). All four are correct calls, properly surfaced.

CRITICAL PLATFORM FINDING (controller, independent): heyspence.me is served by CLOUDFLARE PAGES, not
Netlify. NS = cloudflare, `server: cloudflare`, `cf-cache-status: DYNAMIC`, no x-nf-request-id, and
heyspenceq.pages.dev is live. `netlify.toml` is dead config that nothing reads. Therefore the /hq/*
rewrite added in Task 1 has NEVER been in effect, and a deep link to /hq/<route> would fall through to
Cloudflare's SPA fallback and serve the ROOT landing page, not HQ's index.html. The plan (and the spec)
were wrong about the hosting platform throughout.
USER DECISION (explicit): serve HQ at hq.heyspence.me instead of heyspence.me/hq.
Ruling: adopt the subdomain — it resolves the platform defect rather than papering over it, and gives
HQ its own origin (clean PWA scope, isolated storage, no rewrite ordering). Migration is small because
the router already derives from import.meta.env.BASE_URL: vite base '/' + outDir 'dist', a
public/_redirects SPA fallback, manifest paths at root, delete the committed repo-root hq/ output, and
a second Cloudflare Pages project bound to hq.heyspence.me. Assigned to Task 21 (deploy), not applied
mid-stream, so Tasks 11-12 are reviewed as built.
Cost if wrong: a second Pages project to maintain; reverting to a subfolder would need base/manifest
rework plus a working Cloudflare _redirects rule.
Tasks 11+12: complete (commits dd8f9141..545a95ff, review clean — Spec ✅, Approved, 0 Critical/Important;
  all 4 disclosed deviations verified justified: vite-env.d.ts needed, placeholder anon key, Rail mobile
  collapse required by brief prose vs its own stale sample, and my :root snippet was missing --bnd).
Tasks 11+12: minor (deferred): rail__label--long/--short CSS is dead (Rail renders one span);
  report overstated media-query fidelity as "exactly"; .gate__panel duplicates .frame corner geometry.

BACKEND BRING-UP (controller, via browser automation with user present):
  - User signed in to Supabase (I do not submit credentials); sign-in triggered the restore.
  - Project reached healthy; SQL editor available.
  - CLI `db push` UNUSABLE on this network: no IPv6 route to db:5432, and the IPv4 pooler needs the DB
    password, which I will not ask the user to paste. Applied migrations via the dashboard SQL editor
    instead, as ONE transactional script (begin/commit) + supabase_migrations.schema_migrations rows so
    a future `db push` stays consistent. Script at /tmp/hq_all.sql.
  - Supabase's "creates tables without RLS" warning is a FALSE POSITIVE: 0002 enables RLS inside a
    DO-block via dynamic SQL that the static analyzer cannot see. Chose "Run without RLS" (= run as
    written). Verified after: rls_on=10/10, policies=10.
  - VERIFIED post-migration: hq_tables=10, rls_on=10, policies=10,
    domains=physical,intellectual,spiritual,social,musical,financial,marital (7, correct order),
    habits=9 across 7 domains, hq-photos bucket exists and public=false, public schema still 3 tables.
  - Google OAuth: created NEW GCP project `heyspence-hq` (NOT timpvistacircle — consent screen is
    per-project and HQ's prompt would have read "continue to timpvistacircle", and renaming it would
    have changed Timp Vista Circle's own prompt). App name "HQ", audience External/Testing, support +
    contact espencer.quinn@gmail.com. User personally accepted the Google User Data Policy checkbox.
    Client "HQ web (hq.heyspence.me)" with redirect URI https://utvurjzrvnghbmzjrrhq.supabase.co/auth/v1/callback.
    Added espencer.quinn@gmail.com as a TEST USER — without it, Testing-mode would have blocked his own
    sign-in (was 0 users).
  - Supabase Google provider: ENABLED with the real client id/secret. NOTE: Chrome's password manager
    had AUTOFILLED both fields with the user's Supabase login email/password; cleared before pasting.
    Secrets moved clipboard-only into /tmp/hq_client_id.txt and /tmp/hq_client_secret.txt (umask 077),
    never echoed to the transcript. The secret WAS rendered on-screen in a screenshot by Google's
    one-time dialog — disclosed to user, rotation offered.
  - Redirect URLs: ADDED https://hq.heyspence.me/** (now 6 total); the job board's 5 and the Site URL
    (https://www.heyspence.me/jobs/) left untouched.
  - Exposed schemas: added `hq` (now 4 of 4). Verified functionally end-to-end.
  - Anon/publishable key: Supabase has migrated to the new `sb_publishable_...` format (46 chars).
    Copied via the dashboard's own Copy button -> pbpaste -> hq-app/.env.local (umask 077, gitignored).
    Never rendered in the transcript.
  - SECURITY VERIFIED (SQL): auth_schema_usage=true, anon_schema_usage=FALSE, auth_can_select=true,
    anon_can_select=FALSE, hq.is_owner() exists. Two independent layers: anon cannot reach the schema
    at all, and RLS restricts `authenticated` to the owner email. An unauthenticated REST call to
    hq.habits correctly returns 401 "permission denied for schema hq".
  BACKEND IS COMPLETE AND VERIFIED. Remaining: subdomain code migration (Task 21 amendment) +
  Cloudflare Pages project, then Tasks 13-20 (data layer, STATUS, domains, journal, body record).
Task 21a (subdomain migration): complete (commit 7c4301c8). vite base '/', outDir dist, public/_redirects
  SPA fallback, root-scoped manifest + generated icons, dead /hq/* rewrite removed from netlify.toml,
  committed repo-root hq/ deleted. tsc clean, 83 tests, build OK, assets at /assets/ (no /hq/ prefix).
Branch hq-system PUSHED to origin (new branch; main untouched).
CLOUDFLARE PAGES: project `hq-heyspence` created, repo Espencerquinn/heyspence, production branch
  `hq-system` (deliberately NOT main, so the live site is unaffected while Phase 1 is unfinished).
  Build: `cd hq-app && npm ci && npm run build`, output `hq-app/dist`. Env: VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY (pasted via clipboard), NODE_VERSION=22. First deploy SUCCEEDED.
  Custom domain hq.heyspence.me activated (CNAME hq -> hq-heyspence.pages.dev, auto-created in-zone).
  VERIFIED LIVE: https://hq.heyspence.me = 200, deep link /physical = 200 (SPA _redirects works),
  served HTML references /assets/index-*.js with no /hq/ prefix.
Task 13: implemented (commit 4718016). 91/91 tests, tsc clean, build OK. Brief transcribed verbatim,
  no changes needed. Verification gap (expected): could not complete a fresh Google OAuth sign-in as the
  owner, so "shell renders past LOADING PLAYER DATA" is unverified for the real owner session. Subagent
  did confirm the hq schema is reachable via PostgREST and AuthGate correctly denies a non-owner session.
  Review dispatched (sonnet) over 85cc4397..47180169.
Ruling: T13 Important (plan-mandated) — my SystemContext code sets `error` but never clears it, and the
error branch renders BEFORE children. One transient failure during a routine tickHabit reload strands the
entire UI in SYSTEM ERROR for the session, with no in-app recovery (the retry would have to live inside
the subtree that stopped rendering). Real fragility, not theoretical. Decision: fix — `setError('')` at
the top of reload(), plus a Retry button in the error branch so there IS a recovery path. Plan amended so
a re-run cannot reintroduce it. Enters fix loop as round 1. Folding in the two Minor test gaps as well,
since the implementer is already in this file and both pin real invariants.
Cost if wrong: a Retry button is ~6 lines of UI not in the original brief; trivially removable.
Task 13: minor (deferred): MAX_SCAN=400 defined independently in both derive.ts and streaks.ts.
Task 13: fix round 1 — implementer was killed mid-edit by an API connection error (infrastructure, not
  task failure). Controller inventoried the working tree (setError/Retry/CSS applied but uncommitted,
  tests not yet added) and resumed the same agent with that inventory so nothing was redone.
  Result: commit 2358f70c, 93/93 tests, tsc clean, build OK. Note: `.boot--error` was referenced but
  never styled — implementer added it from tokens only.
Task 13: fix round 1/5 (3 addressed, 0 open — setError('') runs on every reload path, Retry reachable in
  the error branch, both new tests non-vacuous, .boot--error uses tokens only; commits 47180169..2358f70c).
Task 13: complete (commits 85cc4397..2358f70c, review clean after 1 fix round).
Ruling: batching T14+T15 — both are STATUS-screen UI transcribed from the same approved mockup, both
  touch Status.tsx and system.css, and reviewing the assembled screen as one unit is more meaningful than
  reviewing a player card with no quest beside it. Cost if wrong: a finding in one half reopens both.
Tasks 14+15: implemented (commits 4bf9a87 player card/stat block/EXP bar, 3ff2481 daily quest).
  93/93, tsc clean, build OK. No brief-vs-mockup CSS disagreement this time. Live visual/ticking
  verification NOT possible (OAuth grant is a user-only action) — carried to the morning checklist.
  Review dispatched (sonnet) over 2358f70c..3ff24816.
Tasks 14+15: complete (commits 2358f70c..3ff24816, review clean — Spec ✅, Approved, 0 Critical/Important).
  Reviewer independently fetched the mockup and confirmed the CSS is character-for-character identical.
Tasks 14+15: minor (deferred): PlayerCard title-sort has no tiebreak on identical unlocked_at timestamps.
Tasks 14+15: minor (deferred): no pending/disabled state on .obj during tickHabit's round-trip; a very
  fast double-click causes two redundant requests (DB idempotency makes it harmless).
Task 16: implemented (commit d90e93e). 93/93, tsc clean, build OK. Queue mechanics, bonus/level/rank
  gating and CSS fidelity all verified correct by the reviewer (CSS diffed byte-for-byte vs the mockup).
  Controller independently confirmed the T13 setError/Retry fix survived and provider order is correct.
Ruling: T16 — THREE Important findings, all plan-origin, all accepted and being fixed:
  (1) Title badge staleness: unlockTitle persists but local snapshot.titles is never updated, so the
      TITLE ACQUIRED panel promises a title the player card does not show until the next action. The
      reviewer judged this Important rather than Minor because it undercuts trust in the exact cascade
      this task exists to deliver. Agreed. Fix: merge unlocked codes into next.titles before setSnapshot.
  (2) BEST CATCH — the tick path lost its error-surfacing safety net. Pre-T16, tickHabit ended in
      reload(), whose try/catch routed failures to SYSTEM ERROR/Retry. My rewrite calls Supabase five
      times directly with no try/catch, and DailyQuest discards the promise (`void tickHabit(...)`).
      No ErrorBoundary, no unhandledrejection handler => a mid-tick DB blip is silent and leaves the UI
      half-applied. My own "preserve the T13 fix" instruction passed on the letter and missed the
      substance. Fix: wrap tickHabit in try/catch and setError on failure.
  (3) NotificationHost sets aria-modal="true" but never moves focus in and never traps Tab; keyboard
      users tab into background content behind the scrim. The approved mockup focuses the close button
      on open. Fix: focus on mount + trap Tab within the panel.
  Plan amended at Task 16 so a re-run cannot reintroduce any of the three. Enters fix loop as round 1.
  Cost if wrong: focus trapping is the only non-trivial one; if it misbehaves, Escape still closes.
Task 16: minor (deferred): rank comparison recomputes rankFromLevel instead of using before/after.rank;
  longestStreak is proxied by current questStreak (no historical max tracker yet); recoveredWithinDays
  stays null so "The Persistent" cannot unlock until the penalty cascade lands (Task 17);
  .notif__x removes its focus outline (verbatim from the mockup) — relevant once focus trapping exists.
Task 16: fix round 1/5 (3 addressed, 0 open — try/catch encloses every await incl. both loadSnapshot
  calls and the unlockTitle loop; title merge lands after the first setSnapshot, preserves and cannot
  duplicate; focus effect keyed on `current` so queued notices each get focus, Tab+Shift+Tab both
  trapped, single-focusable case safe, focus restored on dismiss; commits d90e93eb..15b33adb).
Task 16: complete (commits 3ff24816..15b33adb, review clean after 1 fix round).
PROCESS FAILURE (mine, caught before dispatch): my pre-flight FINDING 2 ruling — "T17 must not penalize
  days before the player started" — was recorded in this ledger but NEVER applied to the plan text. The
  buggy `earliest ?? addDays(today,-1)` was still there. A first sign-in with seeded habits and zero
  history would have fired a PENALTY for yesterday. Now actually amended, plus a required first-run test.
  Lesson: a ruling that only exists in the ledger is not a ruling that ships.
Task 17: implemented (commit 55c989a). 97/97, tsc clean, build OK. planCatchup's pure core verified
  correct by the reviewer (cumulative clamp traced by hand: 14-day gap w/ 60 XP headroom deducts
  40+20+0x12 = 60 total, level unchanged; Math.abs avoids -0; no-history early return; never today).
  All three prior SystemContext fixes semantically intact.
Ruling: T17 — TWO Important findings, both plan-origin, both accepted:
  (1) PENALTY XP CAN BE DOUBLE-AWARDED. recordPenalty is dedup'd by PK and swallows 23505, but
      award({kind:'penalty'}) has no such guard — the DB partial unique index covers habit/quest_bonus/
      journal, NOT penalty. <StrictMode> double-invokes the mount effect in dev and two tabs do it in
      prod; both runs compute the same plan before either writes, and both award. The penalties table
      stays clean, so `select count(*) from hq.penalties` — the exact check MY brief prescribed — hides
      it. Fix: recordPenalty reports whether it truly inserted (.insert().select(), empty = conflict);
      award only on a genuine insert. Chose the code-only fix over a new DB index so nothing touches the
      live database while the user is asleep.
  (2) The "-N EXP" figure sums LIFETIME penalties (listPenalties has no date filter), so every catch-up
      after the first reports a cumulative total that grows unboundedly wrong. Fix: runCatchup returns
      the total it actually applied; the notice uses that.
  Also folding in Minor #3: "STREAK -> 0" is hardcoded and can state something false after a backlog
  catch-up; derive it from the fresh snapshot.
  Cost if wrong: recordPenalty's return type changes (one caller); notice copy is cosmetic.
Task 17: minor (deferred): logs are windowed to 400 days but events are unwindowed, so an event older
  than the window could generate spurious old penalties (floor-capped, so it cannot delevel).
Task 17: minor (deferred): catch-up does N sequential round trips, extending the loading screen on a
  genuinely long gap.
Task 17: fix round 1/5 (3 addressed, 0 open — recordPenalty returns false on both 23505 and the
  defensive empty-data path; award strictly conditional on a genuine insert; runCatchup returns only
  this-run applied EXP; streak derived from the fresh post-catch-up snapshot; three prior fixes intact;
  commits 55c989ac..432d8a41).
Task 17: complete (commits b5eccb9d..432d8a41, review clean after 1 fix round).
Task 17: minor (deferred, new): the "did anything happen" gate is now `lost > 0` rather than
  "any penalty planned", so a run that plans ONLY zero-cost penalties writes penalties rows but does not
  trigger an in-session reload. Self-correcting on the next reload; avoids a false "-0 EXP" notice.
  Reviewer also judged the implementer's decision NOT to hand-roll a Supabase mock for recordPenalty as
  sound — a mock would assert against itself, not PostgREST. Agreed; deferring real data/ test infra.
Task 18: implemented (commit 43d78ad). 97/97, tsc clean, build OK. Scaffolding solid: last-milestone
  detection correct, focus cap computed globally (better than the brief's domain-scoped example), every
  new DB write wrapped with an inline error, all EXP via the XP constant, files under the line guidance.
Ruling: T18 CRITICAL — milestone toggle is bidirectional but only the check direction awards, and no
  unique index covers kind='milestone'. Check/uncheck/check farms 150 EXP per cycle through ordinary
  clicking. In a game whose whole premise is an earned append-only ledger this is the worst class of bug.
  Decision: make milestone completion ONE-WAY (disable once done) rather than adding a revoke path.
  Rationale: completeTask and goal completion are already irreversible on this same screen, so one-way is
  the internally consistent choice and needs the least new logic — and less new logic is the right bias
  while the user is asleep. Tradeoff accepted: a mis-ticked milestone cannot be undone in-app.
  Cost if wrong: an undo path has to be added later, which is additive, not a rewrite.
Ruling: T18 Important — no creation UI for goals/milestones/tasks; createGoal/createMilestone/createTask
  had zero callers, so Quest Lines and Backlog could only ever show out-of-band rows, and Task 19's
  "pick focus tasks from a domain page" was stranded with no way to create a task. My Step 4 prose gave a
  form only to habits. Decision: add compact Add-goal / Add-milestone / Add-task forms mirroring
  HabitEditor. This is the difference between shipping a usable feature and a decorative one.
Task 18: minor (deferred): HabitEditor's sort_order count includes archived habits (cosmetic ordering).
Task 18: minor (deferred): brief's Interfaces section says toggleMilestone/toggleFocus while its literal
  code says setMilestoneDone/setFocus; implementer correctly followed the literal code.
Task 18: minor (deferred, APP-WIDE): the award-then-reload pattern means a network failure between the
  mutation and the award leaves the entity mutated but unawarded, and a retry click can double-award for
  kinds with no unique index (task, milestone, goal). Flag for the final whole-branch review as a
  cross-cutting hardening item rather than a task-scoped fix.
Task 18: fix round 1/5 (2 addressed, 0 open — done milestones render as non-focusable <div>, so the
  exploit is closed for mouse AND keyboard; no code path sends setMilestoneDone(id,false) anymore; all
  three creation forms wired, validated, clearing, error-surfacing and reloading; GoalForm.tsx accepted
  as a justified new file mirroring HabitEditor's precedent; implementer also fixed a latent bug where an
  empty backlog hid the add-task form; commits 43d78ad3..dd9ea99d).
Task 18: complete (commits 432d8a41..dd9ea99d, review clean after 1 fix round).
Ruling: batching T19+T20 as the final implementation pair — both add a screen consuming useSystem() and
  neither depends on the other. Reviewing them together also gives one coherent look at the last two
  surfaces. Body Record's storage/privacy surface will be called out explicitly in the review prompt so
  batching does not dilute it. Cost if wrong: a finding in one half reopens both.
Tasks 19+20: implemented (commits 4f44e36 journal+focus, d9d13f2 body record). 97/97, tsc clean, build OK.
  Review: Approved. Photo privacy verified SEMANTICALLY (not just by grep): resize applied to the blob
  actually uploaded, no getPublicUrl, signed URLs live only in component useState and are re-resolved on
  change, never cached across mounts or persisted; orphan cleanup intact; a failed upload never reaches
  the award. Journal award-once traced correct across edit / remount / two-tab. Invented CSS verified to
  reuse the existing token family rather than introducing new colors.
Ruling: T19/20 Important — `kind='photo'` XP has NO cap of any kind. journal has a DB unique index on
  (kind, occurred_on) and habit has one on (ref_id, occurred_on); photo has neither, so re-uploading the
  same image N times pays 30 EXP each time. Same class as the T18 milestone exploit, and again my spec's
  omission — it says "Progress photo: 30 EXP" and never says per what.
  Decision: award photo EXP at most ONCE PER DAY, matching journal. The behaviour worth rewarding is
  "took your progress photos today", not "uploaded a file" — and this keeps multi-pose days (front/side/
  back) working without paying three times. Implemented as a client-side check now, plus a PENDING
  migration 0005 extending the partial unique index to 'photo'. I am NOT applying 0005 to the live
  database while the user is asleep; it ships as a queued migration for him to run.
  Cost if wrong: if he wants per-pose awards instead, the cap loosens by changing one predicate.
Tasks 19+20: minor (deferred): resize.ts is the only file in system/ with no test (its scale math could
  be extracted and tested pure); signed-URL resolution duplicated between Timeline and PhotoCompare
  (~15 lines, a useSignedUrls hook would fix); Timeline re-resolves every photo's URL on any reload;
  signed URLs expiring mid-session leave broken thumbnails with no retry; PhotoCompare picks an arbitrary
  pose when several share a date; FocusTasks shows its nudge line twice at 1-2 focused; Timeline's date
  grouping assumes listPhotos() ordering; numeric inputs accept a literal -0.
Tasks 19+20: fix round 1/5 (1 addressed, 0 open — alreadyAwarded computed from live snapshot at submit
  time, award still gated behind a successful upload, keyed on takenOn not today; 0005 migration written
  with correct SQL and verifiably NOT applied; commits d9d13f24..d06e5fba).
Tasks 19+20: complete (commits dd9ea99d..d06e5fba, review Approved + 1 fix round).
ALL 21 TASKS COMPLETE. Dispatching the whole-branch review (opus) over 6c75f6f1..HEAD.
FINAL WHOLE-BRANCH REVIEW (opus): "Merge after fixes." 2 Critical, 5 Important, extensive triage.
Ruling: FINAL FIX WAVE — one dispatch, code-only. Accepting all findings except the four unbuilt spec
  promises, which I am DESCOPING to Phase 2 in the spec rather than building at this hour (sound, canvas
  mote field, 2x penalty quest, .webloc desktop shortcut). The UI copy that promises a penalty quest IS
  being fixed — shipping text that lies to the user is not acceptable even when the feature is descoped.
Ruling: CRITICAL #1 is my failure repeating. Pre-flight FINDING 1 ruled a (kind, occurred_on) unique
  index covering quest_bonus/journal into migration 0001. It was never written. I caught exactly this
  mechanism at Task 17 and named the lesson — and it still shipped here. quest_bonus is therefore
  exploitable in ONE tab by double-clicking the last objective (+100 EXP), and comments in 0005 and
  JournalCapture assert a backstop that does not exist. Fixing via migration 0006 + a disabled state on
  the objective button + correcting the false comments. 0005 and 0006 are QUEUED, not applied — I am not
  touching the live database while the user is asleep.
Ruling: CRITICAL #2 — no pagination anywhere; PostgREST max_rows=1000 truncates xp_events at ~80 days
  and habit_logs at ~111. Past that, streaks read wrong and runCatchup writes PERMANENT penalty rows for
  days that were actually completed. Fixing with a paginating fetchAll() helper in the client rather than
  raising Max Rows, because that setting is project-wide and shared with the job board and Case Hub.
Ruling: accepting Important #3 (mobile domain picker — 6 of 7 domains unreachable on a phone, and the
  spec explicitly promised a picker), #4 (no habit archive — a mistaken habit penalizes you daily forever
  with no in-app remedy), #5 (goals with no milestones can never complete; concurrent milestone clicks
  lose the 500 EXP), #6 (clamp catch-up start to 400 days; bound the photo date input to today, since
  back-dating a photo makes the runaway reachable today), and #8's journalCount one-liner.
Cost if wrong: this is a large single wave; if it regresses something, the branch is not merged and every
  commit is individually revertable.
```
