# Job-Hunter Agent

A scheduled Claude Code cloud routine that discovers roles fitting Spencer's résumé across two tracks —
Anthropic full-time roles, and fractional/part-time/contract/advisory roles anywhere (Utah preferred) —
drafts a tailored résumé + cover letter for each good fit, and posts them to the private job board
(`applications` table in Supabase) for review. It also drafts any roles added to the board by hand.

## Files
- `ROUTINE.md` — the run playbook the agent follows (fetch → dedup → insert → draft → write back).
- `context/master-resume.md` — source-of-truth résumé.
- `context/example-claude-evangelist.md` / `context/example-startup-partnerships.md` — voice/style few-shots.
- `context/style-guide.md` — fit rubric (0–100), the ≥60 draft threshold, and drafting rules.

## How it connects to the board
Writes go to Supabase via PostgREST using the **service-role key** (bypasses RLS). The browser app
only ever uses the anon key. New roles land as `Discovered`; drafted roles move to `Ready for Review`.
On-demand: when Spencer pastes a URL on the board it creates a `manual` row with no draft — the routine
picks it up on its next run. For immediacy, trigger a manual "run now".

## Setup (one time)
1. **Secrets** — provide these to the routine's environment (NOT in the repo):
   - `SUPABASE_URL` = `https://blbeomcshzqabprvbygd.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = service-role key (Supabase → Project Settings → API → service_role)
   - optional: `MAX_DRAFTS` (default 5), `DRY_RUN` (`true` to log-only)
2. **Schedule it** — use the `/schedule` skill to register a daily cloud routine whose prompt is:
   *"Follow the instructions in `agents/job-hunter/ROUTINE.md` exactly."* Suggested cron: `0 13 * * *`
   (7:00 AM Mountain). The skill also supports an immediate run-now for the on-demand path.
3. **First run** — keep `DRY_RUN=true`; confirm the printed plan looks right; then remove `DRY_RUN`.

## Safety
- The routine never invents facts and never overwrites a row that already has a draft.
- The service-role key must stay a routine secret. If it ever leaks, rotate it in the Supabase dashboard.
