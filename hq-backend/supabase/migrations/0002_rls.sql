-- 0002_rls.sql — HQ is PRIVATE to one person. Gate every table to one email,
-- mirroring public.is_job_owner() on the job board.

create or replace function hq.is_owner() returns boolean as $$
  select (auth.jwt() ->> 'email') = 'espencer.quinn@gmail.com';
$$ language sql stable;

grant usage on schema hq to authenticated;
grant all on all tables in schema hq to authenticated;
grant all on all sequences in schema hq to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'habits','habit_logs','goals','milestones','tasks',
    'journal_entries','progress_photos','xp_events','titles','penalties'
  ] loop
    execute format('alter table hq.%I enable row level security', t);
    execute format(
      'create policy %I on hq.%I for all to authenticated
         using (hq.is_owner()) with check (hq.is_owner())',
      t || '_owner_all', t);
  end loop;
end $$;
