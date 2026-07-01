# Job Board + Job-Hunter Agent — Setup & Deploy

Private job-application Kanban served at **`heyspence.me/jobs`** + a scheduled agent
(`agents/job-hunter/`) that drafts tailored résumés and cover letters for fitting roles
(Anthropic full-time + fractional/part-time, Utah preferred).

## Architecture (as built)
- **Frontend:** `jobs-app/` — Vite/React SPA, `base: '/jobs/'`, built into the repo-root `jobs/`
  folder (committed, like `ahs-online/` and `units/`) and served by the existing `heyspence.me`
  Netlify site. A `/jobs/*` rewrite in the root `netlify.toml` handles deep links. **No separate
  Netlify site or subdomain.**
- **Backend:** a dedicated Supabase project **`heyspence`** (ref `utvurjzrvnghbmzjrrhq`,
  `https://utvurjzrvnghbmzjrrhq.supabase.co`) — separate from the `timpviewcircle` project. Its
  CLI project + migrations live in **`jobs-backend/supabase/`**.
- **Auth:** email magic-link (works out of the box). Access is hard-locked to
  `espencer.quinn@gmail.com` in both the client (`AuthGate.tsx`) and the DB (`is_job_owner()` RLS).
  Google sign-in is hidden until wired (see below).

## Status — already done by the setup
- ✅ `heyspence` Supabase project created; DB password saved separately (keep it safe).
- ✅ Migrations applied (`jobs-backend/supabase/migrations/0001–0004`): `applications`,
  `application_notes`, `application_status_history`, single-owner RLS, realtime.
- ✅ Auth Site URL + redirect URLs set (`heyspence.me/jobs/`, `localhost:5173`) via `supabase config push`.
- ✅ Owner user `espencer.quinn@gmail.com` pre-created (so the first magic link works).
- ✅ Production `jobs-app` build committed to `/jobs` with the project's anon key baked in.

## To go live
1. **Deploy the site.** The board ships when `heyspence.me` next deploys with the committed `/jobs`
   folder. If the Netlify site auto-deploys from GitHub `main`, merge this branch → done. If it
   deploys from another branch or manually, deploy that way. (The root `netlify.toml` already has the
   `/jobs/*` rewrite.)
2. **Sign in.** Visit `heyspence.me/jobs`, enter `espencer.quinn@gmail.com`, click "Email me a login
   link", open the link. (Default Supabase auth email is rate-limited but fine for one user; add
   custom SMTP later if desired.)

## Optional — enable Google sign-in later
1. Google Cloud Console → create an OAuth 2.0 Web client; Authorized redirect URI:
   `https://utvurjzrvnghbmzjrrhq.supabase.co/auth/v1/callback`.
2. Supabase → `heyspence` → Authentication → Providers → Google → paste Client ID + secret, enable.
3. Rebuild `jobs-app` with `VITE_GOOGLE_AUTH=1` and re-commit `/jobs` (shows the Google button).

## Enable the agent
See `agents/job-hunter/README.md`. Set routine secrets `SUPABASE_URL` =
`https://utvurjzrvnghbmzjrrhq.supabase.co` and `SUPABASE_SERVICE_ROLE_KEY` (Supabase → `heyspence` →
Project Settings → API → service_role). Schedule via `/schedule`; keep the first run `DRY_RUN=true`.

## Local development
```bash
cd jobs-app
# preview with sample data (no backend):
echo 'VITE_DEMO=1' > .env.local && npm install && npm run dev
# or run against the real project:
printf 'VITE_SUPABASE_URL=https://utvurjzrvnghbmzjrrhq.supabase.co\nVITE_SUPABASE_ANON_KEY=<anon key>\n' > .env.local
npm run dev
```
Rebuild for prod after changes: `npm run build` (writes to `../jobs`) then commit `/jobs`.

## Notes / decisions
- **No public homepage link** — the board is reachable at `heyspence.me/jobs` and password-gated;
  linking it from the public portfolio would broadcast the search.
- Master résumé = repo `resume.pdf`; two Desktop Anthropic résumés are few-shot style refs in
  `agents/job-hunter/context/`. Fit-score threshold for auto-drafting = 60 (in `style-guide.md`).
- On-demand drafting is queued (drafts on the routine's next run / a manual run-now), not instant.
