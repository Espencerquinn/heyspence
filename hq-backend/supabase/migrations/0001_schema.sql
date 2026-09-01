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
