# HQ "The System" — Setup Runbook

Private gamified productivity tracker at **`hq.heyspence.me`**, gated behind Google sign-in.

- Spec: `docs/superpowers/specs/2026-08-31-hq-system-design.md`
- Plan: `docs/superpowers/plans/2026-08-31-hq-system-phase1.md`
- Approved visual mockup: https://claude.ai/code/artifact/c7c1ae5b-5761-41d2-b7d3-39feda53a40e

## Architecture (as built)

- **Frontend:** `hq-app/` — Vite/React/TS SPA. Built and served as its **own Cloudflare Pages project**
  bound to `hq.heyspence.me`. Its own origin, so the PWA installs cleanly and browser storage is
  isolated from the main site.
- **Backend:** the existing **`heyspence`** Supabase project (`utvurjzrvnghbmzjrrhq`), with HQ's tables
  in a dedicated `hq` schema — separate from the job board (`public`) and Case Hub (`case_hub`).
  Migrations live in `hq-backend/supabase/migrations/`.
- **Auth:** Google OAuth only, hard-locked to `espencer.quinn@gmail.com` in both the client
  (`AuthGate.tsx`) and the database (`hq.is_owner()` RLS).

## Platform note — read this before touching deploy config

`heyspence.me` is served by **Cloudflare Pages**, not Netlify. Verified: nameservers are Cloudflare's,
responses carry `server: cloudflare` and `cf-cache-status: DYNAMIC` with no Netlify request id, and
`heyspenceq.pages.dev` is live.

**The repo-root `netlify.toml` is dead config — nothing reads it.** Its rewrites (including the `/hq/*`
one) have never been in effect. Do not add routing rules there and expect them to work. Cloudflare
Pages uses a `_redirects` file in the published output instead.

---

## Step 1 — Unpause Supabase (blocks everything else)

The `heyspence` project is currently **paused**, which also means `heyspence.me/jobs` and Case Hub are
down. Free-tier projects pause after roughly a week of inactivity.

1. https://supabase.com/dashboard → project **heyspence**
2. Click **Restore** / **Unpause**. Wait a few minutes for it to come back.

Confirm it is up:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://utvurjzrvnghbmzjrrhq.supabase.co/rest/v1/
# 401 is success here — the endpoint is alive and demanding a key.
# 000 means still paused.
```

## Step 2 — Expose the `hq` schema

Supabase → **Project Settings → API → Exposed schemas** → add **`hq`** → Save.

Without this, every HQ query fails with *"schema must be one of the following: public"* and the app
hangs on its loading screen.

> **Never run `supabase config push` from `hq-backend/`.** It writes the entire config file, and the
> live project's auth settings (`site_url = https://www.heyspence.me/jobs/`) were pushed from
> `jobs-backend/`. Pushing from here would overwrite them and break job-board sign-in.

## Step 3 — Apply the migrations

```bash
cd hq-backend
supabase link --project-ref utvurjzrvnghbmzjrrhq
supabase db push          # applies 0001_schema, 0002_rls, 0003_storage, 0004_seed
supabase db push --dry-run  # expect: no pending migrations
```

This is additive DDL creating a new schema. It does not touch `public` or `case_hub`.

## Step 4 — Google OAuth client

**4a. Consent screen** (only if this Google Cloud project has never had an OAuth client)

1. https://console.cloud.google.com → pick or create a project
2. **APIs & Services → OAuth consent screen**
3. User type **External** → Create
4. App name `HQ`, user support email = your address, developer contact = your address
5. Scopes: skip — the defaults (email, profile, openid) are all that is needed
6. Test users: add `espencer.quinn@gmail.com`
7. Save. Leave it in **Testing** — publishing is for apps with real users; you are the only user.

**4b. The client**

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. Name: `HQ`
4. **Authorized redirect URIs** → Add URI, exactly:

   ```
   https://utvurjzrvnghbmzjrrhq.supabase.co/auth/v1/callback
   ```

   This is Supabase's callback, not your app's. Google redirects to Supabase; Supabase then redirects
   to HQ. Getting this wrong produces `redirect_uri_mismatch`.
5. Create. Copy the **Client ID** and **Client secret**.

**4c. Wire it into Supabase**

Supabase → **Authentication → Providers → Google** → enable → paste Client ID and Client secret → Save.

**4d. Redirect URLs**

Supabase → **Authentication → URL Configuration → Redirect URLs**. **Add** these — do not replace what
is there, the job board's URLs are in that list:

```
https://hq.heyspence.me/**
http://localhost:5173/**
```

Leave **Site URL** as `https://www.heyspence.me/jobs/`. HQ passes its own `redirectTo` on every sign-in,
so it does not depend on Site URL, and changing it would break the job board.

## Step 5 — The anon key

Supabase → **Project Settings → API → Project API keys → `anon` `public`**. Copy it.

```bash
cd hq-app
printf 'VITE_SUPABASE_URL=https://utvurjzrvnghbmzjrrhq.supabase.co\nVITE_SUPABASE_ANON_KEY=<paste>\n' > .env.local
```

`.env.local` is gitignored. The anon key is safe in a browser bundle — it grants nothing on its own;
RLS is what protects the data.

## Step 6 — Cloudflare Pages project for `hq.heyspence.me`

1. https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**
2. Repository: `Espencerquinn/heyspence`
3. Build settings:
   - **Project name:** `hq-heyspence`
   - **Production branch:** `main`
   - **Framework preset:** None
   - **Build command:** `cd hq-app && npm ci && npm run build`
   - **Build output directory:** `hq-app/dist`
4. **Environment variables** (Production *and* Preview):
   - `VITE_SUPABASE_URL` = `https://utvurjzrvnghbmzjrrhq.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = the anon key from Step 5
   - `NODE_VERSION` = `22`
5. Save and Deploy.
6. **Custom domains → Set up a custom domain** → `hq.heyspence.me` → Activate. Because the zone is
   already on Cloudflare, the CNAME is created for you; no manual DNS record.

SPA deep links are handled by `hq-app/public/_redirects` (`/*  /index.html  200`), which Cloudflare
Pages reads from the published output.

## Step 7 — Verify

1. Visit `https://hq.heyspence.me` → the System gate renders.
2. **Sign in with Google** → returns to `hq.heyspence.me` signed in.
3. Sign in with any other Google account → "Not authorized".
4. A deep link (`https://hq.heyspence.me/physical`) loads directly rather than 404ing.
5. `https://www.heyspence.me/jobs` and `/repairs` still work — nothing about this touched them.

## Local development

```bash
cd hq-app
npm install
npm run dev        # http://localhost:5173
npm test           # pure system-module suite
npx tsc -p tsconfig.app.json --noEmit   # type-check; vitest does NOT type-check
npm run build
```

Always run **all three** of test, tsc, and build before committing — Vitest compiles through esbuild and
will happily pass a suite that does not type-check.
