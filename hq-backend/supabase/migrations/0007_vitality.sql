-- 0007_vitality.sql — Morning Protocol (meds & supplements), Fuel (food log),
-- and Health sync (Apple Health / Apple Watch / Tonal via Health Auto Export).
-- Additive only: new columns default to today's behavior, new tables are new.

-- ---------- habits: protocol items + activation date ----------

-- `kind` splits the Morning Protocol (medication / supplement) from ordinary
-- habits. Protocol items are still habits — they ride the same cadence, log,
-- streak and EXP machinery — they just render first, with their dose.
alter table hq.habits
  add column if not exists kind text not null default 'habit'
    check (kind in ('habit', 'medication', 'supplement')),
  add column if not exists dose text,
  add column if not exists notes text,
  -- Auto-tick from synced health data: 'steps' compares the day's step count to
  -- target_count; 'workout' is met by any synced workout that day; 'strength'
  -- only by a strength workout (Tonal reports as Traditional Strength Training).
  add column if not exists auto_source text
    check (auto_source in ('steps', 'workout', 'strength')),
  -- A habit is never due before this date. Without it, adding a habit (or
  -- restoring a paused one) makes earlier days retroactively "missed" and the
  -- lazy penalty catch-up fines days that were cleared under the old list.
  add column if not exists active_from date;

update hq.habits set active_from = (created_at at time zone 'America/Denver')::date
  where active_from is null;
alter table hq.habits
  alter column active_from set default current_date,
  alter column active_from set not null;

-- ---------- Fuel: food log + macro targets ----------

create table if not exists hq.food_entries (
  id          uuid primary key default gen_random_uuid(),
  eaten_on    date    not null,
  meal        text    not null default 'snack'
                check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  name        text    not null,
  servings    numeric(6,2) not null default 1 check (servings > 0),
  -- Macros are stored PER SERVING; the day's totals multiply by servings.
  kcal        numeric(7,1) not null default 0,
  protein_g   numeric(6,1) not null default 0,
  carbs_g     numeric(6,1) not null default 0,
  fat_g       numeric(6,1) not null default 0,
  fiber_g     numeric(6,1),
  serving_label text,                         -- "1 cup", "100 g", "1 bar"
  source      text not null default 'manual'
                check (source in ('manual', 'off', 'usda', 'ai', 'repeat')),
  source_ref  text,                           -- barcode / FDC id
  created_at  timestamptz not null default now()
);
create index if not exists food_entries_day_idx on hq.food_entries (eaten_on desc, created_at);

-- Singleton row (id is always true) so there is exactly one set of targets.
create table if not exists hq.macro_targets (
  id         boolean primary key default true check (id),
  kcal       int not null default 2200,
  protein_g  int not null default 180,
  carbs_g    int not null default 200,
  fat_g      int not null default 70,
  fiber_g    int not null default 30,
  updated_at timestamptz not null default now()
);
insert into hq.macro_targets (id) values (true) on conflict do nothing;

-- ---------- Health sync ----------

-- One value per metric per day (steps, active_energy, resting_heart_rate,
-- sleep_hours, weight_lb, hrv, ...). The ingest function upserts, so a later
-- export of the same day simply overwrites with the fuller number.
create table if not exists hq.health_daily (
  metric_date date    not null,
  metric      text    not null,
  value       numeric not null,
  unit        text,
  updated_at  timestamptz not null default now(),
  primary key (metric_date, metric)
);

create table if not exists hq.workouts (
  id            uuid primary key default gen_random_uuid(),
  external_id   text not null unique,        -- Health Auto Export workout id
  name          text not null,               -- "Traditional Strength Training"
  source        text,                        -- "Tonal", "Apple Watch"
  started_at    timestamptz not null,
  ended_at      timestamptz,
  workout_date  date not null,               -- local day, for joining to habits
  duration_min  numeric(6,1),
  active_kcal   numeric(7,1),
  avg_hr        numeric(5,1),
  max_hr        numeric(5,1),
  created_at    timestamptz not null default now()
);
create index if not exists workouts_date_idx on hq.workouts (workout_date desc);

-- ---------- access ----------

grant all on hq.food_entries, hq.macro_targets, hq.health_daily, hq.workouts to authenticated;

do $$
declare t text;
begin
  foreach t in array array['food_entries', 'macro_targets', 'health_daily', 'workouts'] loop
    execute format('alter table hq.%I enable row level security', t);
    execute format('drop policy if exists %I on hq.%I', t || '_owner_all', t);
    execute format(
      'create policy %I on hq.%I for all to authenticated
         using (hq.is_owner()) with check (hq.is_owner())',
      t || '_owner_all', t);
  end loop;
end $$;

-- The hq-health-ingest Edge Function writes with the service role (it is
-- authenticated by its own shared secret, not a user JWT). Grant it only the
-- two health tables — nothing else in hq.
grant usage on schema hq to service_role;
grant select, insert, update on hq.health_daily, hq.workouts to service_role;
