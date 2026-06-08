# Lead Management Kanban — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture `timpviewcircle.com` website leads into a database, manage them on a login-gated Kanban board (3 Google accounts), and send an instant email per new lead plus a 7:00 AM MT daily digest of status changes and notes.

**Architecture:** The existing static site (in `timpviewcircle/`) gets its lead form wired to a Netlify Function that writes to Supabase (primary) while the page also posts to the existing Google Form (backup). A separate Vite + React SPA at `app.timpviewcircle.com` provides the board, gated by Google OAuth with a 3-email allowlist enforced by Supabase Row-Level Security. Email is sent via Resend from `info@timpviewcircle.com`. The daily digest is a Supabase Edge Function invoked by pg_cron.

**Tech Stack:** Supabase (Postgres, Auth, Edge Functions, pg_cron), Vite + React + TypeScript, @dnd-kit for drag-and-drop, Netlify Functions (Node), Resend (email), Cloudflare DNS.

**Spec:** `timpviewcircle/docs/superpowers/specs/2026-06-08-timpviewcircle-lead-kanban-design.md`

**Decision (deviation from spec, flagged for review):** Instant new-lead email is sent directly from the `submit-lead` Netlify Function after a successful insert, not via a Supabase database webhook. All inserts flow through this one function, so this is simpler and equally reliable.

---

## Task Type Legend

- **[You]** — a dashboard/account action only the account owner can perform. Exact click-path + verification given.
- **[Code]** — implementable in the repo; TDD where there is real logic.

## File Structure

Created/modified, relative to repo root `heyspence.me/`:

```
supabase/                              # Supabase CLI project (NEW)
  config.toml
  migrations/
    0001_init.sql                      # leads, notes, allowed_users + enum + updated_at trigger
    0002_rls.sql                       # row-level security policies
    0003_cron.sql                      # pg_cron schedule for digest
  functions/
    daily-digest/index.ts              # scheduled digest Edge Function
    _shared/digest.ts                  # pure aggregator (unit-tested)
    _shared/digest.test.ts
    _shared/email.ts                   # Resend wrapper

timpviewcircle/
  netlify.toml                         # MODIFY: add [functions] + [dev]
  netlify/functions/
    submit-lead.js                     # lead insert + instant email (NEW)
    submit-lead.test.js                # unit tests (NEW)
  package.json                         # NEW (deps for the function + tests)
  index.html                           # MODIFY: form id/honeypot already present; JS hookup
  lead-form.js                         # NEW: dual-write submit handler
  styles.css                           # MODIFY: honeypot hide + status styles (minor)

timpviewcircle-app/                    # Vite + React SPA (NEW), own Netlify site
  index.html
  netlify.toml
  package.json
  vite.config.ts
  .env.example
  src/
    main.tsx
    App.tsx
    supabaseClient.ts
    auth/AuthGate.tsx                  # login + allowlist gating
    board/Board.tsx                    # columns + dnd context
    board/Column.tsx
    board/LeadCard.tsx
    board/LeadDetail.tsx               # detail drawer + notes thread
    board/NotesThread.tsx
    board/AddNote.tsx
    data/leads.ts                      # queries/mutations
    data/notes.ts
    types.ts
```

---

## Phase 0 — Accounts & Local Tooling

### Task 0.1: Install local tooling [Code]

**Files:** none (environment).

- [ ] **Step 1: Install the Supabase and Netlify CLIs and Deno**

Run:
```bash
npm install -g supabase netlify-cli
brew install deno   # Deno is the Edge Functions runtime; needed for digest tests
```

- [ ] **Step 2: Verify**

Run: `supabase --version && netlify --version && deno --version`
Expected: each prints a version with no error.

### Task 0.2: Create the Supabase project [You]

- [ ] **Step 1:** Go to https://supabase.com/dashboard → **New project**. Name `timpviewcircle`, region `West US (North California)` (closest to UT), set a strong DB password, save it in your password manager.
- [ ] **Step 2:** When provisioned, open **Project Settings → API** and copy: **Project URL**, **anon public key**, **service_role key**. Open **Project Settings → API → JWT** later only if needed.
- [ ] **Step 3 (verify):** Paste the Project URL into a browser; it should return a small JSON health response, not an error.

Record these three values; they are used in Tasks 1.x, 2.x, 4.x as `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### Task 0.3: Create the Google OAuth client [You]

- [ ] **Step 1:** https://console.cloud.google.com → create/select a project `timpviewcircle`.
- [ ] **Step 2:** **APIs & Services → OAuth consent screen** → External → fill app name "Timpview Circle Leads", support email `spencer@heyspence.me` → add the three users as **Test users** (espencer.quinn@, carissaquinn02@, morganeadsrealestate@gmail.com) → Save. (Test mode is fine for 3 users; no verification needed.)
- [ ] **Step 3:** **Credentials → Create credentials → OAuth client ID → Web application**. Under **Authorized redirect URIs** add exactly:
  `https://<your-project-ref>.supabase.co/auth/v1/callback`
  (find `<your-project-ref>` in the Supabase Project URL).
- [ ] **Step 4:** Copy the **Client ID** and **Client secret**.
- [ ] **Step 5 (wire into Supabase):** Supabase dashboard → **Authentication → Providers → Google** → enable, paste Client ID + secret → Save.
- [ ] **Step 6 (verify):** Supabase **Authentication → Providers** shows Google as **Enabled**.

### Task 0.4: Create the Resend account + API key [You]

- [ ] **Step 1:** https://resend.com → sign up → **API Keys → Create**. Name `timpviewcircle`, permission **Sending access**. Copy the key (starts `re_`). This is `RESEND_API_KEY`.
- [ ] **Step 2:** **Domains → Add Domain** → `timpviewcircle.com`. Resend shows DKIM/SPF (and optionally DMARC) records. Leave this tab open for Task 5.1.
- [ ] **Step 3 (verify):** the key is saved in your password manager; domain shows status "Not Started/Pending" (we verify DNS in Task 5.1).

### Task 0.5: Link the Supabase CLI to the project [Code]

**Files:** Create `supabase/` (via CLI).

- [ ] **Step 1: Initialize and link**

Run (from repo root):
```bash
cd "/Users/quinnkb/Desktop/Dev Projects/heyspence.me"
supabase init
supabase link --project-ref <your-project-ref>
```
Enter the DB password when prompted.

- [ ] **Step 2: Verify**

Run: `supabase migration list`
Expected: connects and shows an empty/remote migration list with no error.

- [ ] **Step 3: Commit scaffolding**

```bash
git checkout lead-kanban   # ensure on the feature branch
git add supabase/config.toml supabase/.gitignore
git commit -m "chore: init supabase project"
```

---

## Phase 1 — Database Schema & Security

### Task 1.1: Schema migration — tables, enum, updated_at trigger [Code]

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0001_init.sql

-- Pipeline stages, in board order. 'Lost' is terminal/parallel.
create type lead_status as enum (
  'New', 'Contacted', 'Showing Scheduled', 'Following Up', 'Offer', 'Closed', 'Lost'
);

create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text not null,
  interest    text not null,
  status      lead_status not null default 'New',
  source      text not null default 'website form',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.notes (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references public.leads(id) on delete cascade,
  author_email text not null,
  author_name  text not null,
  body         text not null,
  created_at   timestamptz not null default now()
);

create table public.allowed_users (
  email        text primary key,
  display_name text not null
);

insert into public.allowed_users (email, display_name) values
  ('espencer.quinn@gmail.com', 'Spencer'),
  ('carissaquinn02@gmail.com', 'Carissa'),
  ('morganeadsrealestate@gmail.com', 'Morgan');

-- bump updated_at on any row change (this is how status moves get a timestamp)
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_touch_updated_at
  before update on public.leads
  for each row execute function public.touch_updated_at();

create index notes_lead_id_created_at_idx on public.notes (lead_id, created_at desc);
create index leads_updated_at_idx on public.leads (updated_at desc);
```

- [ ] **Step 2: Apply to remote**

Run: `supabase db push`
Expected: applies `0001_init.sql` with no error.

- [ ] **Step 3: Verify the schema exists**

Run:
```bash
supabase db remote query "select count(*) from public.allowed_users;"
```
Expected: returns `3`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat(db): leads, notes, allowed_users schema + updated_at trigger"
```

### Task 1.2: Row-Level Security policies [Code]

**Files:**
- Create: `supabase/migrations/0002_rls.sql`

The rule: a request is "a team member" iff its JWT email is in `allowed_users`. Team members can do everything; the public/anon role can do nothing (inserts happen via the service role in the Netlify function, which bypasses RLS).

- [ ] **Step 1: Write the migration**

```sql
-- 0002_rls.sql

alter table public.leads          enable row level security;
alter table public.notes          enable row level security;
alter table public.allowed_users  enable row level security;

-- Helper: is the current authenticated user on the allowlist?
create or replace function public.is_team_member() returns boolean as $$
  select exists (
    select 1 from public.allowed_users a
    where a.email = (auth.jwt() ->> 'email')
  );
$$ language sql stable security definer set search_path = public;

-- leads: team members have full access; nobody else
create policy leads_team_all on public.leads
  for all to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

-- notes: same
create policy notes_team_all on public.notes
  for all to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

-- allowed_users: team members may read (to render author names); no client writes
create policy allowed_users_team_read on public.allowed_users
  for select to authenticated
  using (public.is_team_member());
```

- [ ] **Step 2: Apply**

Run: `supabase db push`
Expected: applies `0002_rls.sql` with no error.

- [ ] **Step 3: Verify RLS blocks anon reads**

Run (anon key, should return zero rows / permission-denied, NOT lead data):
```bash
curl -s "$SUPABASE_URL/rest/v1/leads?select=id" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```
Expected: `[]` (RLS hides rows from anon). If it returns lead rows, the policy is wrong — stop and fix.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_rls.sql
git commit -m "feat(db): row-level security gated to allowed_users"
```

---

## Phase 2 — Lead Capture (dual-write + instant email)

### Task 2.1: Netlify Function package setup [Code]

**Files:**
- Create: `timpviewcircle/package.json`
- Modify: `timpviewcircle/netlify.toml`

- [ ] **Step 1: Create `timpviewcircle/package.json`**

```json
{
  "name": "timpviewcircle-site",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0"
  }
}
```

- [ ] **Step 2: Install**

Run:
```bash
cd "/Users/quinnkb/Desktop/Dev Projects/heyspence.me/timpviewcircle"
npm install
```
Expected: creates `node_modules/` and `package-lock.json`.

- [ ] **Step 3: Modify `timpviewcircle/netlify.toml`** — add functions dir and keep publish. Final file:

```toml
[build]
  publish = "."
  command = ""
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

# Basic security headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

- [ ] **Step 4: Add `node_modules` ignore**

Append to `timpviewcircle/.gitignore` (the file already ignores `node_modules/` at the repo's static level — confirm it contains `node_modules/`; if not, add it).

- [ ] **Step 5: Commit**

```bash
git add timpviewcircle/package.json timpviewcircle/package-lock.json timpviewcircle/netlify.toml timpviewcircle/.gitignore
git commit -m "chore(site): add functions config + supabase client dep"
```

### Task 2.2: `submit-lead` function — validation & honeypot (TDD) [Code]

**Files:**
- Create: `timpviewcircle/netlify/functions/submit-lead.test.js`
- Create: `timpviewcircle/netlify/functions/submit-lead.js`

We isolate the pure logic (`validateLead`) so it is unit-testable without network. The handler wires validation → insert → email.

- [ ] **Step 1: Write the failing test**

```js
// submit-lead.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLead } from './submit-lead.js';

test('accepts a complete lead and normalizes fields', () => {
  const r = validateLead({ name: ' Jane ', email: 'JANE@x.com', phone: '801-555-1212', interest: 'lot1' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { name: 'Jane', email: 'jane@x.com', phone: '801-555-1212', interest: 'lot1' });
});

test('rejects missing required fields', () => {
  const r = validateLead({ name: '', email: 'a@b.com', phone: '1', interest: 'lot1' });
  assert.equal(r.ok, false);
});

test('rejects malformed email', () => {
  const r = validateLead({ name: 'Jane', email: 'not-an-email', phone: '1', interest: 'lot1' });
  assert.equal(r.ok, false);
});

test('honeypot field set => treated as spam', () => {
  const r = validateLead({ name: 'Jane', email: 'a@b.com', phone: '1', interest: 'lot1', company: 'spammer' });
  assert.equal(r.ok, false);
  assert.equal(r.spam, true);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd timpviewcircle && node --test`
Expected: FAIL — `validateLead` is not exported / not defined.

- [ ] **Step 3: Implement `submit-lead.js`**

```js
// submit-lead.js
import { createClient } from '@supabase/supabase-js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pure, unit-testable. `company` is a honeypot field hidden from humans.
export function validateLead(input) {
  if (input && typeof input.company === 'string' && input.company.trim() !== '') {
    return { ok: false, spam: true };
  }
  const name = (input?.name ?? '').trim();
  const email = (input?.email ?? '').trim().toLowerCase();
  const phone = (input?.phone ?? '').trim();
  const interest = (input?.interest ?? '').trim();
  if (!name || !email || !phone || !interest) return { ok: false };
  if (!EMAIL_RE.test(email)) return { ok: false };
  return { ok: true, value: { name, email, phone, interest } };
}

async function sendInstantEmail(lead) {
  const recipients = [
    'espencer.quinn@gmail.com',
    'carissaquinn02@gmail.com',
    'morganeadsrealestate@gmail.com',
  ];
  const appUrl = 'https://app.timpviewcircle.com';
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Timpview Circle <info@timpviewcircle.com>',
      to: recipients,
      reply_to: 'spencer@heyspence.me',
      subject: `New lead: ${lead.name} (${lead.interest})`,
      html: `<h2>New lead</h2>
        <p><strong>Name:</strong> ${lead.name}</p>
        <p><strong>Email:</strong> ${lead.email}</p>
        <p><strong>Phone:</strong> ${lead.phone}</p>
        <p><strong>Interest:</strong> ${lead.interest}</p>
        <p><strong>Received:</strong> ${new Date(lead.created_at).toLocaleString('en-US', { timeZone: 'America/Denver' })} MT</p>
        <p><a href="${appUrl}">Open the board →</a></p>`,
    }),
  });
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  let input;
  try { input = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: 'Bad JSON' }; }

  const result = validateLead(input);
  if (!result.ok) {
    // Spam (honeypot) and validation both return 200 so bots/users get no signal,
    // but spam is silently dropped and never stored.
    if (result.spam) return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'invalid' }) };
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('leads')
    .insert(result.value)
    .select('id, name, email, phone, interest, created_at')
    .single();

  if (error) {
    // Do not fail the visitor: the Google Form backup already captured the lead.
    console.error('lead insert failed', error);
    return { statusCode: 200, body: JSON.stringify({ ok: true, stored: false }) };
  }

  try { await sendInstantEmail(data); }
  catch (e) { console.error('instant email failed', e); } // non-fatal

  return { statusCode: 200, body: JSON.stringify({ ok: true, stored: true }) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd timpviewcircle && node --test`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add timpviewcircle/netlify/functions/submit-lead.js timpviewcircle/netlify/functions/submit-lead.test.js
git commit -m "feat(site): submit-lead function with validation, honeypot, instant email"
```

### Task 2.3: Front-end dual-write submit handler [Code]

**Files:**
- Modify: `timpviewcircle/index.html` (add honeypot input; include script)
- Create: `timpviewcircle/lead-form.js`

> **Build-time input needed from you:** the live Google Form's `formResponse` URL and the `entry.NNNN` field IDs for name/email/phone/interest. Placeholders below are marked `GFORM_*` — replace with the real values before deploy (Task 5.x verification will catch them if missed).

- [ ] **Step 1: Add a honeypot field + script tag to `index.html`** — inside the `<form id="leadForm">`, immediately before the submit button, add:

```html
                    <!-- honeypot: hidden from humans, bots fill it -->
                    <div class="hp-field" aria-hidden="true">
                        <input type="text" id="company" name="company" tabindex="-1" autocomplete="off">
                    </div>
```

And before `</body>` add:

```html
    <script src="lead-form.js"></script>
```

- [ ] **Step 2: Hide the honeypot in `styles.css`** — append:

```css
.hp-field { position: absolute; left: -5000px; height: 0; overflow: hidden; }
```

- [ ] **Step 3: Create `lead-form.js`**

```js
// lead-form.js — dual-write: Supabase (via Netlify fn) primary, Google Form backup.
const GFORM_ACTION = 'https://docs.google.com/forms/d/e/REPLACE_FORM_ID/formResponse';
const GFORM_FIELDS = {
  name: 'entry.REPLACE_NAME',
  email: 'entry.REPLACE_EMAIL',
  phone: 'entry.REPLACE_PHONE',
  interest: 'entry.REPLACE_INTEREST',
};

const form = document.getElementById('leadForm');

function postToGoogleForm(payload) {
  // fire-and-forget; no-cors so the cross-origin POST is allowed and never blocks us
  const body = new URLSearchParams();
  for (const [k, entry] of Object.entries(GFORM_FIELDS)) body.append(entry, payload[k] ?? '');
  return fetch(GFORM_ACTION, { method: 'POST', mode: 'no-cors', body }).catch(() => {});
}

function postToBackend(payload) {
  return fetch('/.netlify/functions/submit-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => ({ ok: false }));
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('.form-submit');
  btn.disabled = true; // prevent double-submit

  const payload = {
    name: form.name.value,
    email: form.email.value,
    phone: form.phone.value,
    interest: form.interest.value,
    company: form.company.value, // honeypot
  };

  // Both writes fire in parallel and are independent.
  await Promise.allSettled([postToBackend(payload), postToGoogleForm(payload)]);

  form.reset();
  btn.disabled = false;
  form.innerHTML = '<h3 class="form-title">Thanks! We\'ll be in touch shortly.</h3>';
});
```

- [ ] **Step 4: Manual verification (local)**

Run:
```bash
cd "/Users/quinnkb/Desktop/Dev Projects/heyspence.me/timpviewcircle"
netlify dev   # serves the static site + functions locally
```
In another shell, post a test lead to the local function:
```bash
curl -s -X POST http://localhost:8888/.netlify/functions/submit-lead \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test User","email":"test@example.com","phone":"8015551212","interest":"lot1"}'
```
Expected: `{"ok":true,"stored":true}` (requires env vars set locally — see note). Then confirm the row:
```bash
supabase db remote query "select name,status from public.leads where email='test@example.com';"
```
Expected: one row, status `New`. Delete it afterward:
```bash
supabase db remote query "delete from public.leads where email='test@example.com';"
```

> **Local env note:** create `timpviewcircle/.env` (gitignored) with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` so `netlify dev` injects them. Never commit this file.

- [ ] **Step 5: Commit**

```bash
git add timpviewcircle/index.html timpviewcircle/styles.css timpviewcircle/lead-form.js
git commit -m "feat(site): dual-write lead form (Supabase + Google Form backup)"
```

---

## Phase 3 — Kanban App (auth, board, notes)

### Task 3.1: Scaffold the Vite + React app [Code]

**Files:** Create `timpviewcircle-app/` tree.

- [ ] **Step 1: Scaffold**

Run (from repo root):
```bash
cd "/Users/quinnkb/Desktop/Dev Projects/heyspence.me"
npm create vite@latest timpviewcircle-app -- --template react-ts
cd timpviewcircle-app
npm install
npm install @supabase/supabase-js @dnd-kit/core @dnd-kit/sortable
```

- [ ] **Step 2: Create `.env.example`**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
Then create `.env.local` (gitignored) with the real anon values from Task 0.2.

- [ ] **Step 3: Create `timpviewcircle-app/netlify.toml`**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- [ ] **Step 4: Verify dev server boots**

Run: `npm run dev`
Expected: Vite serves on `http://localhost:5173` with the starter page.

- [ ] **Step 5: Commit**

```bash
cd "/Users/quinnkb/Desktop/Dev Projects/heyspence.me"
git add timpviewcircle-app
git commit -m "chore(app): scaffold vite react-ts kanban app"
```

### Task 3.2: Types + Supabase client [Code]

**Files:**
- Create: `timpviewcircle-app/src/types.ts`
- Create: `timpviewcircle-app/src/supabaseClient.ts`

- [ ] **Step 1: `types.ts`**

```ts
export const STATUSES = [
  'New', 'Contacted', 'Showing Scheduled', 'Following Up', 'Offer', 'Closed', 'Lost',
] as const;
export type Status = typeof STATUSES[number];

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  status: Status;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  lead_id: string;
  author_email: string;
  author_name: string;
  body: string;
  created_at: string;
}
```

- [ ] **Step 2: `supabaseClient.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: type-checks and builds with no error.

- [ ] **Step 4: Commit**

```bash
git add timpviewcircle-app/src/types.ts timpviewcircle-app/src/supabaseClient.ts
git commit -m "feat(app): shared types + supabase client"
```

### Task 3.3: Auth gate (Google sign-in + allowlist) [Code]

**Files:**
- Create: `timpviewcircle-app/src/auth/AuthGate.tsx`
- Modify: `timpviewcircle-app/src/App.tsx`

Allowlist is enforced server-side by RLS (Task 1.2). The client additionally shows a friendly "not authorized" screen if a signed-in user can read nothing — but security does not depend on the client.

- [ ] **Step 1: `AuthGate.tsx`**

```tsx
import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setAuthorized(null); return; }
    // If RLS lets us read allowed_users, we're a team member.
    supabase.from('allowed_users').select('email').limit(1).then(({ data, error }) => {
      setAuthorized(!error && !!data && data.length > 0);
    });
  }, [session]);

  if (!session) {
    return (
      <div className="signin">
        <h1>Timpview Circle — Leads</h1>
        <button onClick={() => supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        })}>Sign in with Google</button>
      </div>
    );
  }
  if (authorized === null) return <div className="signin">Checking access…</div>;
  if (!authorized) {
    return (
      <div className="signin">
        <h1>Not authorized</h1>
        <p>{session.user.email} doesn’t have access.</p>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    );
  }
  return <>{children}</>;
}
```

- [ ] **Step 2: `App.tsx`**

```tsx
import { AuthGate } from './auth/AuthGate';
import { Board } from './board/Board';

export default function App() {
  return (
    <AuthGate>
      <Board />
    </AuthGate>
  );
}
```

- [ ] **Step 3: Verify the sign-in screen renders**

Run: `npm run dev` → open `http://localhost:5173`.
Expected: a "Sign in with Google" button. (Full OAuth round-trip is verified in Task 5.3 once redirect URLs are configured; locally it will redirect to Google and back to localhost.)

- [ ] **Step 4: Commit**

```bash
git add timpviewcircle-app/src/auth/AuthGate.tsx timpviewcircle-app/src/App.tsx
git commit -m "feat(app): google auth gate with allowlist check"
```

### Task 3.4: Data layer — leads & notes [Code]

**Files:**
- Create: `timpviewcircle-app/src/data/leads.ts`
- Create: `timpviewcircle-app/src/data/notes.ts`

- [ ] **Step 1: `leads.ts`**

```ts
import { supabase } from '../supabaseClient';
import type { Lead, Status } from '../types';

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return data as Lead[];
}

export async function updateLeadStatus(id: string, status: Status): Promise<void> {
  const { error } = await supabase.from('leads').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function updateLeadFields(
  id: string, fields: Partial<Pick<Lead, 'name' | 'email' | 'phone' | 'interest'>>,
): Promise<void> {
  const { error } = await supabase.from('leads').update(fields).eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 2: `notes.ts`**

```ts
import { supabase } from '../supabaseClient';
import type { Note } from '../types';

export async function fetchNotes(leadId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Note[];
}

// author_* come from the signed-in user; RLS still independently enforces access.
export async function addNote(leadId: string, body: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const email = u.user?.email ?? '';
  const { data: au } = await supabase
    .from('allowed_users').select('display_name').eq('email', email).single();
  const { error } = await supabase.from('notes').insert({
    lead_id: leadId, body, author_email: email, author_name: au?.display_name ?? email,
  });
  if (error) throw error;
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: builds clean.

- [ ] **Step 4: Commit**

```bash
git add timpviewcircle-app/src/data
git commit -m "feat(app): leads + notes data layer"
```

### Task 3.5: Board, columns, cards with drag-to-change-status [Code]

**Files:**
- Create: `timpviewcircle-app/src/board/Board.tsx`, `Column.tsx`, `LeadCard.tsx`

- [ ] **Step 1: `LeadCard.tsx`**

```tsx
import { useDraggable } from '@dnd-kit/core';
import type { Lead } from '../types';

export function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: (l: Lead) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} className="lead-card" {...listeners} {...attributes}
         onClick={() => onOpen(lead)}>
      <div className="lead-card__name">{lead.name}</div>
      <div className="lead-card__meta">{lead.interest}</div>
      <div className="lead-card__time">
        {new Date(lead.updated_at).toLocaleDateString('en-US', { timeZone: 'America/Denver' })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `Column.tsx`**

```tsx
import { useDroppable } from '@dnd-kit/core';
import type { Lead, Status } from '../types';
import { LeadCard } from './LeadCard';

export function Column(
  { status, leads, onOpen }: { status: Status; leads: Lead[]; onOpen: (l: Lead) => void },
) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={`column${isOver ? ' column--over' : ''}`}>
      <h2 className="column__title">{status} <span>{leads.length}</span></h2>
      <div className="column__cards">
        {leads.map((l) => <LeadCard key={l.id} lead={l} onOpen={onOpen} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `Board.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { STATUSES, type Lead, type Status } from '../types';
import { fetchLeads, updateLeadStatus } from '../data/leads';
import { Column } from './Column';
import { LeadDetail } from './LeadDetail';
import { supabase } from '../supabaseClient';

export function Board() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [open, setOpen] = useState<Lead | null>(null);

  async function load() { setLeads(await fetchLeads()); }
  useEffect(() => { load(); }, []);

  async function onDragEnd(e: DragEndEvent) {
    const leadId = String(e.active.id);
    const newStatus = e.over?.id as Status | undefined;
    if (!newStatus) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;
    // optimistic update
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
    try { await updateLeadStatus(leadId, newStatus); }
    catch { load(); } // revert from source of truth on failure
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Timpview Circle — Leads</h1>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>
      <DndContext onDragEnd={onDragEnd}>
        <div className="board">
          {STATUSES.map((s) => (
            <Column key={s} status={s} leads={leads.filter((l) => l.status === s)} onOpen={setOpen} />
          ))}
        </div>
      </DndContext>
      {open && <LeadDetail lead={open} onClose={() => { setOpen(null); load(); }} />}
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: builds clean (LeadDetail referenced — created next; if building before Task 3.6, temporarily comment its import).

- [ ] **Step 5: Commit**

```bash
git add timpviewcircle-app/src/board/Board.tsx timpviewcircle-app/src/board/Column.tsx timpviewcircle-app/src/board/LeadCard.tsx
git commit -m "feat(app): kanban board with drag-to-change-status"
```

### Task 3.6: Lead detail drawer + notes thread [Code]

**Files:**
- Create: `timpviewcircle-app/src/board/LeadDetail.tsx`, `NotesThread.tsx`, `AddNote.tsx`

This is the "make notes and save them to a lead" requirement.

- [ ] **Step 1: `AddNote.tsx`**

```tsx
import { useState } from 'react';
import { addNote } from '../data/notes';

export function AddNote({ leadId, onAdded }: { leadId: string; onAdded: () => void }) {
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!body.trim()) return;
    setSaving(true);
    try { await addNote(leadId, body.trim()); setBody(''); onAdded(); }
    finally { setSaving(false); }
  }
  return (
    <div className="add-note">
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a note…" />
      <button disabled={saving || !body.trim()} onClick={submit}>
        {saving ? 'Saving…' : 'Add note'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: `NotesThread.tsx`**

```tsx
import type { Note } from '../types';

export function NotesThread({ notes }: { notes: Note[] }) {
  if (notes.length === 0) return <p className="notes-empty">No notes yet.</p>;
  return (
    <ul className="notes">
      {notes.map((n) => (
        <li key={n.id} className="note">
          <div className="note__head">
            <strong>{n.author_name}</strong>
            <span>{new Date(n.created_at).toLocaleString('en-US', { timeZone: 'America/Denver' })}</span>
          </div>
          <div className="note__body">{n.body}</div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: `LeadDetail.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { Lead, Note } from '../types';
import { fetchNotes } from '../data/notes';
import { NotesThread } from './NotesThread';
import { AddNote } from './AddNote';

export function LeadDetail({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  async function loadNotes() { setNotes(await fetchNotes(lead.id)); }
  useEffect(() => { loadNotes(); }, [lead.id]);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <button className="drawer__close" onClick={onClose}>×</button>
        <h2>{lead.name}</h2>
        <dl className="lead-fields">
          <dt>Email</dt><dd>{lead.email}</dd>
          <dt>Phone</dt><dd>{lead.phone}</dd>
          <dt>Interest</dt><dd>{lead.interest}</dd>
          <dt>Status</dt><dd>{lead.status}</dd>
        </dl>
        <h3>Notes</h3>
        <AddNote leadId={lead.id} onAdded={loadNotes} />
        <NotesThread notes={notes} />
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: builds clean.

- [ ] **Step 5: Commit**

```bash
git add timpviewcircle-app/src/board/LeadDetail.tsx timpviewcircle-app/src/board/NotesThread.tsx timpviewcircle-app/src/board/AddNote.tsx
git commit -m "feat(app): lead detail drawer with notes thread + add note"
```

### Task 3.7: Minimal styling [Code]

**Files:**
- Modify: `timpviewcircle-app/src/index.css` (replace starter styles)

- [ ] **Step 1: Replace `index.css`** with a compact board layout:

```css
:root { font-family: system-ui, sans-serif; }
body { margin: 0; background: #0f1115; color: #e7e9ee; }
.signin { display: grid; place-items: center; min-height: 100vh; gap: 1rem; text-align: center; }
.signin button { padding: .6rem 1rem; font-size: 1rem; cursor: pointer; }
.topbar { display: flex; justify-content: space-between; align-items: center; padding: .75rem 1rem; border-bottom: 1px solid #232733; }
.board { display: flex; gap: .75rem; padding: 1rem; overflow-x: auto; align-items: flex-start; }
.column { background: #161a22; border-radius: 10px; min-width: 240px; padding: .5rem; }
.column--over { outline: 2px dashed #4f7cff; }
.column__title { font-size: .85rem; text-transform: uppercase; letter-spacing: .04em; display: flex; justify-content: space-between; color: #9aa3b2; }
.column__cards { display: flex; flex-direction: column; gap: .5rem; min-height: 40px; }
.lead-card { background: #1f2533; border-radius: 8px; padding: .6rem; cursor: grab; }
.lead-card__name { font-weight: 600; }
.lead-card__meta, .lead-card__time { font-size: .8rem; color: #9aa3b2; }
.drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; justify-content: flex-end; }
.drawer { width: min(420px, 100%); background: #161a22; height: 100%; padding: 1.25rem; overflow-y: auto; }
.drawer__close { float: right; background: none; border: none; color: #e7e9ee; font-size: 1.5rem; cursor: pointer; }
.lead-fields { display: grid; grid-template-columns: auto 1fr; gap: .25rem .75rem; }
.lead-fields dt { color: #9aa3b2; }
.add-note textarea { width: 100%; min-height: 64px; background: #0f1115; color: inherit; border: 1px solid #232733; border-radius: 6px; padding: .5rem; }
.notes { list-style: none; padding: 0; display: flex; flex-direction: column; gap: .6rem; }
.note { background: #1f2533; border-radius: 8px; padding: .5rem .6rem; }
.note__head { display: flex; justify-content: space-between; font-size: .8rem; color: #9aa3b2; }
```

- [ ] **Step 2: Verify** — `npm run dev`, confirm board columns render side by side (no data yet until logged in).

- [ ] **Step 3: Commit**

```bash
git add timpviewcircle-app/src/index.css
git commit -m "style(app): board + drawer styling"
```

---

## Phase 4 — Notifications: Daily Digest

### Task 4.1: Digest aggregator (pure, TDD) [Code]

**Files:**
- Create: `supabase/functions/_shared/digest.ts`
- Create: `supabase/functions/_shared/digest.test.ts`

The aggregator turns raw rows into the digest's content. It is pure (no I/O) so it is fully unit-testable with Deno's test runner.

- [ ] **Step 1: Write the failing test**

```ts
// digest.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildDigest, type StatusChange, type NoteRow } from './digest.ts';

Deno.test('empty activity yields a no-changes digest', () => {
  const d = buildDigest([], []);
  assertEquals(d.hasActivity, false);
  assertEquals(d.subject, 'Timpview leads — no changes today');
});

Deno.test('summarizes status changes and notes', () => {
  const changes: StatusChange[] = [
    { lead_name: 'Jane', from_status: 'New', to_status: 'Contacted', changed_at: '2026-06-08T15:00:00Z' },
  ];
  const notes: NoteRow[] = [
    { lead_name: 'Jane', author_name: 'Carissa', body: 'Left voicemail', created_at: '2026-06-08T16:00:00Z' },
  ];
  const d = buildDigest(changes, notes);
  assertEquals(d.hasActivity, true);
  assertEquals(d.subject, 'Timpview leads — 1 status change, 1 note');
  // body mentions both
  assertEquals(d.html.includes('Jane') && d.html.includes('New → Contacted'), true);
  assertEquals(d.html.includes('Left voicemail'), true);
});

Deno.test('pluralization is correct', () => {
  const changes: StatusChange[] = [
    { lead_name: 'A', from_status: 'New', to_status: 'Offer', changed_at: 'x' },
    { lead_name: 'B', from_status: 'New', to_status: 'Lost', changed_at: 'x' },
  ];
  const d = buildDigest(changes, []);
  assertEquals(d.subject, 'Timpview leads — 2 status changes, 0 notes');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd supabase/functions/_shared && deno test`
Expected: FAIL — `./digest.ts` not found.

- [ ] **Step 3: Implement `digest.ts`**

```ts
// digest.ts — pure digest builder.
export interface StatusChange {
  lead_name: string; from_status: string; to_status: string; changed_at: string;
}
export interface NoteRow {
  lead_name: string; author_name: string; body: string; created_at: string;
}
export interface Digest { hasActivity: boolean; subject: string; html: string; }

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function buildDigest(changes: StatusChange[], notes: NoteRow[]): Digest {
  const hasActivity = changes.length > 0 || notes.length > 0;
  if (!hasActivity) {
    return {
      hasActivity: false,
      subject: 'Timpview leads — no changes today',
      html: '<h2>No changes today</h2><p>No status changes or new notes in the last 24 hours.</p>',
    };
  }
  const subject = `Timpview leads — ${plural(changes.length, 'status change')}, ${plural(notes.length, 'note')}`;
  const changesHtml = changes.length
    ? `<h3>Status changes</h3><ul>${changes.map((c) =>
        `<li><strong>${c.lead_name}</strong>: ${c.from_status} → ${c.to_status}</li>`).join('')}</ul>`
    : '';
  const notesHtml = notes.length
    ? `<h3>New notes</h3><ul>${notes.map((n) =>
        `<li><strong>${n.lead_name}</strong> — ${n.author_name}: ${n.body}</li>`).join('')}</ul>`
    : '';
  return { hasActivity, subject, html: `<h2>Daily lead summary</h2>${changesHtml}${notesHtml}` };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd supabase/functions/_shared && deno test`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/digest.ts supabase/functions/_shared/digest.test.ts
git commit -m "feat(digest): pure digest aggregator with tests"
```

> **Note on status-change tracking:** `buildDigest` consumes `StatusChange` rows. Since `leads` only stores current status + `updated_at`, "changes in the last 24h" are derived in Task 4.2 from leads whose `updated_at` is within the window. To capture true from→to transitions we add a lightweight history table in Task 4.2.

### Task 4.2: Status-history table + capture trigger [Code]

**Files:**
- Create: `supabase/migrations/0004_status_history.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0004_status_history.sql
create table public.status_history (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  from_status lead_status,
  to_status   lead_status not null,
  changed_at  timestamptz not null default now()
);

alter table public.status_history enable row level security;
create policy status_history_team_read on public.status_history
  for select to authenticated using (public.is_team_member());

create or replace function public.record_status_change() returns trigger as $$
begin
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.status_history (lead_id, from_status, to_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger leads_record_status_change
  after update on public.leads
  for each row execute function public.record_status_change();

create index status_history_changed_at_idx on public.status_history (changed_at desc);
```

- [ ] **Step 2: Apply**

Run: `supabase db push`
Expected: applies with no error.

- [ ] **Step 3: Verify the trigger records a change**

Run:
```bash
supabase db remote query "
  insert into public.leads (name,email,phone,interest) values ('Hist','h@x.com','1','lot1');
  update public.leads set status='Contacted' where email='h@x.com';
  select from_status,to_status from public.status_history sh
    join public.leads l on l.id=sh.lead_id where l.email='h@x.com';
  delete from public.leads where email='h@x.com';"
```
Expected: one row `New | Contacted`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0004_status_history.sql
git commit -m "feat(db): status_history table + capture trigger"
```

### Task 4.3: Daily-digest Edge Function [Code]

**Files:**
- Create: `supabase/functions/_shared/email.ts`
- Create: `supabase/functions/daily-digest/index.ts`

- [ ] **Step 1: `_shared/email.ts`**

```ts
export async function sendEmail(opts: { subject: string; html: string }): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Timpview Circle <info@timpviewcircle.com>',
      to: ['espencer.quinn@gmail.com', 'carissaquinn02@gmail.com', 'morganeadsrealestate@gmail.com'],
      reply_to: 'spencer@heyspence.me',
      subject: opts.subject,
      html: opts.html,
    }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
}
```

- [ ] **Step 2: `daily-digest/index.ts`** — only sends when it is 7 AM in Denver (handles DST; pg_cron fires at both candidate UTC hours, see Task 4.4).

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildDigest, type StatusChange, type NoteRow } from '../_shared/digest.ts';
import { sendEmail } from '../_shared/email.ts';

function denverHour(now: Date): number {
  return Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver', hour: 'numeric', hour12: false,
  }).format(now));
}

Deno.serve(async (req) => {
  // Guard: only proceed at 7 AM Denver. Allow ?force=1 for manual test runs.
  const force = new URL(req.url).searchParams.get('force') === '1';
  if (!force && denverHour(new Date()) !== 7) {
    return new Response(JSON.stringify({ skipped: true, reason: 'not 7am MT' }), { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: sh } = await supabase
    .from('status_history')
    .select('from_status,to_status,changed_at,leads(name)')
    .gte('changed_at', since)
    .order('changed_at', { ascending: true });

  const { data: nt } = await supabase
    .from('notes')
    .select('body,author_name,created_at,leads(name)')
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  const changes: StatusChange[] = (sh ?? []).map((r: any) => ({
    lead_name: r.leads?.name ?? '(deleted)', from_status: r.from_status ?? '—',
    to_status: r.to_status, changed_at: r.changed_at,
  }));
  const notes: NoteRow[] = (nt ?? []).map((r: any) => ({
    lead_name: r.leads?.name ?? '(deleted)', author_name: r.author_name,
    body: r.body, created_at: r.created_at,
  }));

  const digest = buildDigest(changes, notes);
  await sendEmail({ subject: digest.subject, html: digest.html });
  return new Response(JSON.stringify({ sent: true, subject: digest.subject }), { status: 200 });
});
```

- [ ] **Step 3: Set function secrets + deploy**

Run:
```bash
cd "/Users/quinnkb/Desktop/Dev Projects/heyspence.me"
supabase secrets set RESEND_API_KEY=<re_...key>
supabase functions deploy daily-digest --no-verify-jwt
```
Expected: deploy succeeds, prints the function URL.

- [ ] **Step 4: Verify with a forced run**

Run:
```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/daily-digest?force=1" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```
Expected: `{"sent":true,...}` and a digest email arrives at all three inboxes (check spam until Task 5.1 verifies the domain).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/email.ts supabase/functions/daily-digest/index.ts
git commit -m "feat(digest): daily-digest edge function (7am MT guard, force flag)"
```

### Task 4.4: Schedule the digest with pg_cron [Code]

**Files:**
- Create: `supabase/migrations/0005_cron.sql`

7 AM America/Denver is 13:00 UTC (MDT, summer) or 14:00 UTC (MST, winter). We schedule both; the function's `denverHour() === 7` guard ensures it actually sends only once per day.

- [ ] **Step 1: Write the migration**

```sql
-- 0005_cron.sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace <PROJECT_REF> and <ANON_KEY> before applying (the verify step checks this).
select cron.schedule(
  'daily-digest-mdt', '0 13 * * *',
  $$ select net.http_post(
       url := 'https://<PROJECT_REF>.functions.supabase.co/daily-digest',
       headers := '{"Authorization":"Bearer <ANON_KEY>","Content-Type":"application/json"}'::jsonb
     ); $$
);
select cron.schedule(
  'daily-digest-mst', '0 14 * * *',
  $$ select net.http_post(
       url := 'https://<PROJECT_REF>.functions.supabase.co/daily-digest',
       headers := '{"Authorization":"Bearer <ANON_KEY>","Content-Type":"application/json"}'::jsonb
     ); $$
);
```

- [ ] **Step 2: Apply** (after substituting the two placeholders)

Run: `supabase db push`
Expected: applies with no error.

- [ ] **Step 3: Verify the jobs exist**

Run: `supabase db remote query "select jobname, schedule from cron.job;"`
Expected: two rows `daily-digest-mdt 0 13 * * *` and `daily-digest-mst 0 14 * * *`. If either still contains `<PROJECT_REF>`, fix and re-run.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0005_cron.sql
git commit -m "feat(digest): pg_cron schedule at 13:00 and 14:00 UTC (7am MT)"
```

---

## Phase 5 — Deploy & End-to-End

### Task 5.1: Verify the Resend domain in Cloudflare [You]

- [ ] **Step 1:** In the Resend domain tab (Task 0.4), copy each DKIM/SPF/DMARC record.
- [ ] **Step 2:** Cloudflare → `timpviewcircle.com` → **DNS → Records** → add each record exactly as shown. For the SPF/DKIM CNAME/TXT records, set **Proxy status = DNS only** (grey cloud) — email records must not be proxied.
- [ ] **Step 3:** Back in Resend, click **Verify**.
- [ ] **Step 4 (verify):** Resend shows the domain **Verified**. Re-run the Task 4.3 forced digest; the email should now land in the inbox (not spam).

### Task 5.2: Deploy the static site function env [You]

- [ ] **Step 1:** Netlify → the **timpviewcircle** site → **Site configuration → Environment variables**. Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`.
- [ ] **Step 2:** Trigger a deploy (push the branch or **Deploys → Trigger deploy**).
- [ ] **Step 3 (verify):** `curl -X POST https://timpviewcircle.com/.netlify/functions/submit-lead -H 'Content-Type: application/json' -d '{"name":"E2E","email":"e2e@x.com","phone":"1","interest":"lot1"}'` returns `{"ok":true,"stored":true}`; an instant email arrives; then delete the row via `supabase db remote query`.

### Task 5.3: Deploy the Kanban app + DNS [You]

- [ ] **Step 1:** Netlify → **Add new site → Import from Git** → select the `heyspence` repo → set **base directory** `timpviewcircle-app`, build `npm run build`, publish `timpviewcircle-app/dist`.
- [ ] **Step 2:** Add env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` to this site; deploy.
- [ ] **Step 3:** Netlify → this site → **Domain management** → add custom domain `app.timpviewcircle.com`. Netlify shows a target like `<site>.netlify.app`.
- [ ] **Step 4:** Cloudflare → add `CNAME app → <site>.netlify.app`, **Proxy status = DNS only** initially so Netlify can issue its TLS cert.
- [ ] **Step 5:** Supabase → **Authentication → URL Configuration** → set **Site URL** to `https://app.timpviewcircle.com` and add it to **Redirect URLs**. Also add `http://localhost:5173` for local dev.
- [ ] **Step 6 (verify):** Visit `https://app.timpviewcircle.com`, sign in with each of the three Google accounts → board loads. Sign in with a non-allowlisted Google account → "Not authorized" screen.

### Task 5.4: Full end-to-end acceptance [You + Code]

- [ ] **Step 1:** Submit the real form on `https://timpviewcircle.com` with a test name. Verify: (a) instant email to all three; (b) the lead appears in **New** on the board; (c) a row appears in the Google Form responses (backup).
- [ ] **Step 2:** On the board, drag the lead **New → Contacted**, then open it and add a note "test note".
- [ ] **Step 3:** Force the digest: `curl -X POST "$SUPABASE_URL/functions/v1/daily-digest?force=1" -H "Authorization: Bearer $SUPABASE_ANON_KEY"`. Verify the email lists the New→Contacted change and the "test note".
- [ ] **Step 4:** Delete the test lead (`supabase db remote query "delete from public.leads where ..."`).
- [ ] **Step 5: Merge** — open a PR from `lead-kanban` to `main`, or fast-forward merge locally once satisfied.

---

## Self-Review

**Spec coverage:**
- Login-gated board, Google OAuth, 3-user allowlist → Tasks 0.3, 1.2, 3.3, 5.3 ✓
- Kanban with the 7 stages → Tasks 1.1 (enum), 3.5 ✓
- Equal access for all three → single RLS policy, no roles ✓
- Instant new-lead email → Task 2.2 ✓
- 7 AM MT daily digest of status changes + notes, always sent → Tasks 4.1–4.4 ✓
- Notes saved to a lead → Tasks 1.1 (notes table), 3.6 ✓
- Dual-write capture with Google Form backup → Tasks 2.2, 2.3 ✓
- From `info@timpviewcircle.com`, reply-to `spencer@heyspence.me` → Tasks 2.2, 4.3 ✓
- Cloudflare DNS, Netlify, Resend setup → Phase 5 ✓
- Security (RLS, honeypot, server-side keys) → Tasks 1.2, 2.2 ✓
- Testing (digest aggregator, insert validation, e2e) → Tasks 2.2, 4.1, 5.4 ✓

**Placeholder scan:** Intentional, clearly-marked substitutions only: `<your-project-ref>`, `GFORM_*`/`REPLACE_*` Google Form IDs (needed from you at build), `<PROJECT_REF>`/`<ANON_KEY>` in cron SQL. Each has a verify step that fails loudly if left unsubstituted. No vague "add error handling"-style gaps.

**Type consistency:** `validateLead`/`handler` (Task 2.2) consistent. `Status`/`STATUSES`/`Lead`/`Note` used identically across app tasks. `StatusChange`/`NoteRow`/`buildDigest` consistent between 4.1 and 4.3. `is_team_member()` defined in 1.2, reused in 4.2. `status_history` columns match between 4.2 and the 4.3 query.
