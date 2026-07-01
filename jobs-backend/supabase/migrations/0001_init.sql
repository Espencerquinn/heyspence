-- 0001_init.sql — job-application tracker schema (heyspence project).
-- Self-contained: this project is dedicated to the job board.

-- Board columns, in order. 'Archived' is terminal (used for low-fit roles too).
create type application_status as enum (
  'Discovered', 'Drafting', 'Ready for Review',
  'Applied', 'Interviewing', 'Offer', 'Rejected', 'Archived'
);

create table public.applications (
  id              uuid primary key default gen_random_uuid(),
  company         text not null default 'Anthropic',
  role_title      text not null,
  job_url         text not null unique,           -- dedup key (Greenhouse absolute_url)
  greenhouse_id   bigint unique,                  -- secondary dedup; null for manual adds
  location        text,
  team            text,
  salary_range    text,
  job_description text,                            -- decoded, tag-stripped JD
  fit_summary     text,                            -- agent's rationale
  fit_score       int,                             -- 0..100
  tailored_resume text,                            -- null => agent should draft
  cover_letter    text,
  status          application_status not null default 'Discovered',
  source          text not null default 'agent',   -- 'agent' | 'manual'
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.application_notes (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  author_email   text not null,
  author_name    text not null,
  body           text not null,
  created_at     timestamptz not null default now()
);

-- bump updated_at on any row change
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger applications_touch_updated_at
  before update on public.applications
  for each row execute function public.touch_updated_at();

create index applications_updated_at_idx on public.applications (updated_at desc);
create index applications_status_idx on public.applications (status);
create index application_notes_app_id_created_at_idx
  on public.application_notes (application_id, created_at desc);
