# Timpview Circle — Lead Management Kanban

**Date:** 2026-06-08
**Status:** Approved (design)
**Project:** `timpviewcircle` (static site, Netlify, Cloudflare DNS)

## Summary

Add a private, login-gated lead-management system to the existing `timpviewcircle.com`
property site. Website lead-form submissions are saved to a database (and mirrored to the
existing Google Form as a backup), surfaced on a Kanban board that three people sign in to
with Google, and drive two kinds of email notification: an instant alert on every new lead,
and a 7:00 AM Mountain Time daily digest of status changes and notes.

## Goals

- Capture website leads into a durable store (currently the form goes nowhere on disk; live
  site posts to a Google Form).
- A Kanban board to manage leads through a defined pipeline.
- Google OAuth login restricted to three known people, all with equal access.
- Instant email to all three on every new lead.
- A 7:00 AM MT daily digest to all three summarizing the last 24 hours of status changes and
  new notes — always sent, even when there was no activity ("No changes today").

## Non-Goals (YAGNI)

SMS/text alerts; multiple properties; analytics dashboards; a public lead-status page;
in-app/push notifications; per-user roles or permissions. All deferrable.

## Users

Three equal users (allowlist; also the notification recipients):

| Name    | Email                          |
|---------|--------------------------------|
| Spencer | espencer.quinn@gmail.com       |
| Carissa | carissaquinn02@gmail.com       |
| Morgan (agent) | morganeadsrealestate@gmail.com |

## Architecture (Approach 1)

```
            timpviewcircle.com (existing static site, Netlify) — unchanged except form wiring
                          │
              visitor submits lead form
                          │  (dual-write, parallel)
            ┌─────────────┴──────────────┐
            ▼                             ▼
   Netlify Function                Google Form (existing)
   (insert, honeypot)              formResponse POST — BACKUP
            │
            ▼
         Supabase ── Postgres (leads, notes, allowed_users)
          │  │          │
   Google OAuth         ├──► DB webhook on new lead ──► Resend ──► instant email → all 3
   (allowlist via RLS)  └──► scheduled job @ 7AM MT  ──► Resend ──► daily digest → all 3
          │
          ▼
   app.timpviewcircle.com (Vite + React Kanban SPA, Netlify) — sign in, drag, note
```

Three units of work:
1. **Existing site** — wire the lead form to call the insert function (primary) and keep the
   Google Form POST (backup). No other changes.
2. **Supabase project** — database, auth, new-lead webhook, scheduled digest job.
3. **Kanban app** — new Vite + React SPA at `app.timpviewcircle.com`, login-gated.

### Why this approach

Leaves the live static site essentially untouched, consolidates auth + DB + cron + webhooks
in Supabase, costs nothing at this scale, and is the fastest to stand up. Alternatives
(full-stack Next.js; all-Netlify with the sunset Identity product) were rejected as more work
or more friction for needs this small.

## Data Model

**`leads`**
- `id` (uuid, pk)
- `name` (text)
- `email` (text)
- `phone` (text)
- `interest` (text — from the form's select)
- `status` (enum/text; default `New`; one of the pipeline stages below)
- `source` (text; default `website form`)
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz; bumped on any change, incl. status moves)

**`notes`**
- `id` (uuid, pk)
- `lead_id` (uuid → leads, cascade delete)
- `author_email` (text)
- `author_name` (text)
- `body` (text)
- `created_at` (timestamptz, default now)

**`allowed_users`**
- `email` (text, pk)
- `display_name` (text)

Seeded with the three users; editable later to add a fourth person.

### Pipeline stages (Kanban columns, in order)

`New → Contacted → Showing Scheduled → Following Up → Offer → Closed`, plus `Lost`.

Status changes are detected by comparing new vs. old `status` on update; these and new
`notes` rows are the daily-digest line items.

## Flows

### Flow A — New lead (dual-write + instant email)
1. Visitor submits the form on `timpviewcircle.com`.
2. Browser fires two parallel requests:
   - **Primary** → Netlify Function → inserts into `leads` (status `New`). The privileged
     Supabase key lives only in the function, never in the page. A honeypot field reduces
     spam.
   - **Backup** → existing Google Form `formResponse` POST, unchanged.
3. The Supabase insert triggers a **database webhook** → Resend sends the **instant email**
   to all three: name, email, phone, interest, timestamp, and a link to the board.

The two writes are independent: if the Supabase path fails, the Google Form still captures
the lead, and Google Forms' own response notification serves as a backup alert.

### Flow B — Managing leads (`app.timpviewcircle.com`)
1. Visit app → "Sign in with Google." Supabase checks the email against `allowed_users` via
   RLS; non-allowlisted accounts get a "not authorized" screen and can access nothing.
2. Seven columns; each lead is a card showing name, interest, and last activity.
3. **Drag a card** to another column → updates `status`, bumps `updated_at`. This is the
   status change the digest reports.
4. **Open a card** → full details, editable basic fields, and the running notes thread; add a
   note (auto-tagged with author name + timestamp).
5. All three users have identical abilities.

### Flow C — Daily digest @ 7:00 AM MT
1. Supabase scheduled job runs at 7:00 AM America/Denver.
2. Aggregates the last 24 hours: every status change and every new note.
3. Resend sends one digest email to all three. If there was no activity, it still sends a
   short "No changes today" email so the team knows the automation ran.

## Infrastructure & Setup

- **Resend:** verify `timpviewcircle.com` (DKIM/SPF/DMARC records added in Cloudflare). Send
  from `info@timpviewcircle.com`; reply-to `spencer@heyspence.me`.
- **Supabase:** project with the three tables, RLS policies, Google OAuth provider (backed by
  a Google Cloud OAuth client), the new-lead DB webhook, and the scheduled digest job.
- **Cloudflare DNS:** `CNAME app → <netlify app site>`, plus the Resend email records.
- **Netlify:** a second site for the Kanban app bound to `app.timpviewcircle.com`; one
  serverless function for the lead insert.

## Security

- **Row-Level Security** on all tables: only authenticated users whose email is in
  `allowed_users` may read/modify `leads` and `notes`.
- Public site can **only insert** leads, and only through the Netlify Function (service key
  server-side) with a honeypot; visitors can never read leads.
- Non-allowlisted Google sign-ins are rejected at the RLS layer (see nothing, change nothing).
- Secrets (Supabase service key, Resend API key) live only in server-side env vars.

## Error Handling

- **Dual-write is the safety net** — Supabase failure does not lose a lead (Google Form
  captures it; Google's response email is a backup alert).
- Email send failures are logged; Resend retries transient errors.
- Form guards: required-field validation; submit button disables to prevent double-submits.
- Digest job: because it always sends, a missing 7 AM email is itself the signal that the job
  failed.

## Testing

- **Unit tests** on the digest aggregator: correct summary from a set of changes/notes;
  correct "nothing changed" path; correct 24-hour America/Denver window boundaries.
- **Function tests** on the lead insert: valid submission, invalid/missing fields, honeypot
  triggered.
- **End-to-end:** submit a test lead → lands on board + instant email fires; move a card and
  add a note → both appear in a manually triggered digest; confirm a non-allowlisted Google
  account is rejected.

## Open Implementation Details (resolved at build time)

- Exact Google Form `formResponse` URL and `entry.*` field IDs (pulled from the live form).
- Reconcile the live `index.html` form markup with the on-disk copy (`action="#"`).
- Supabase scheduled-job mechanism (pg_cron + Edge Function) vs. Netlify Scheduled Function —
  choose during implementation; both meet the 7 AM MT requirement.
