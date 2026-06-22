# Job Board + Job-Hunter Agent — Setup & Deploy

Private job-application Kanban (`jobs-app/`) + a scheduled agent (`agents/job-hunter/`) that drafts
tailored résumés and cover letters for fitting Anthropic roles. Built by reusing the `timpviewcircle-app`
pattern on the **same Supabase project** (`blbeomcshzqabprvbygd`).

The code is done. The steps below are the owner-only actions (dashboards / secrets) needed to go live.

## 1. Apply the database migrations
New files: `supabase/migrations/0007_applications.sql` … `0010_applications_realtime.sql` (additive —
they don't touch the existing `leads`/real-estate tables except adding the new tables to realtime).

**Option A — Supabase CLI** (needs the CLI + DB password):
```bash
npm install -g supabase           # or: brew install supabase/tap/supabase
cd ~/repos/heyspence
supabase link --project-ref blbeomcshzqabprvbygd
supabase db push                  # applies 0007–0010
```
**Option B — Dashboard:** Supabase → SQL Editor → paste each file's contents in order 0007 → 0008 → 0009 → 0010 and run.

Verify: `applications` table exists, RLS is on, and `select public.is_job_owner()` returns true only for your email.

## 2. Supabase Auth redirect URL
Supabase → Authentication → URL Configuration → add `https://jobs.heyspence.me` to **Redirect URLs**.
(The app uses `window.location.origin` for OAuth; without this, Google sign-in fails in production.)

## 3. Deploy the SPA to Netlify
- New Netlify site from this repo, **base directory** `jobs-app/` (build `npm run build`, publish `dist` —
  already in `jobs-app/netlify.toml`).
- Env vars: `VITE_SUPABASE_URL` = `https://blbeomcshzqabprvbygd.supabase.co`,
  `VITE_SUPABASE_ANON_KEY` = the project's anon key.
- Custom domain: `jobs.heyspence.me` (add the DNS record Netlify shows).

Access is hard-locked to `espencer.quinn@gmail.com` in both the client (`AuthGate.tsx`) and the database
(`is_job_owner()` RLS) — the timpviewcircle co-users cannot see it.

## 4. Schedule the agent
See `agents/job-hunter/README.md`. In short: set routine secrets `SUPABASE_URL` +
`SUPABASE_SERVICE_ROLE_KEY` (and optional `MAX_DRAFTS`, `DRY_RUN`), then use `/schedule` to register a
daily routine whose prompt is *"Follow `agents/job-hunter/ROUTINE.md` exactly."* Keep the first run as
`DRY_RUN=true`, confirm the plan, then turn it off.

## 5. Local development
```bash
cd jobs-app
cp .env.example .env.local        # fill in real VITE_SUPABASE_URL + anon key
npm install && npm run dev        # http://localhost:5173
```

## Notes / decisions
- **No public homepage link** was added: the "things I've shipped" section is your public portfolio, and a
  job-board link there would broadcast your search. The board is reachable directly at `jobs.heyspence.me`.
- Master résumé = repo `resume.pdf`; the two Desktop Anthropic résumés are few-shot style references in
  `agents/job-hunter/context/`. Fit-score threshold for auto-drafting = 60 (tune in `style-guide.md`).
- On-demand drafting is queued (drafts on the routine's next run / a manual run-now), not instant —
  a consequence of using a Claude Code routine rather than an API the browser can call.
