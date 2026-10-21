-- 0009_ingest_log.sql — the last few Health Auto Export POSTs, kept so a payload
-- the parser does not understand can be inspected instead of silently dropped.
create table if not exists hq.ingest_log (
  id          bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  automation  text,
  summary     jsonb not null default '{}',   -- counts of what was written
  sample      jsonb                          -- truncated raw payload
);
alter table hq.ingest_log enable row level security;
drop policy if exists ingest_log_owner_all on hq.ingest_log;
create policy ingest_log_owner_all on hq.ingest_log for all to authenticated
  using (hq.is_owner()) with check (hq.is_owner());
grant select on hq.ingest_log to authenticated;
grant select, insert, delete on hq.ingest_log to service_role;
