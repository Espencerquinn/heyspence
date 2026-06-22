-- 0008_applications_rls.sql
-- The job board is PRIVATE to one person. Do NOT reuse is_team_member()
-- (that allowlist includes the real-estate co-users). Gate to a single email.

alter table public.applications      enable row level security;
alter table public.application_notes enable row level security;

-- Owner check: is the current authenticated user the board owner?
create or replace function public.is_job_owner() returns boolean as $$
  select (auth.jwt() ->> 'email') = 'espencer.quinn@gmail.com';
$$ language sql stable;

-- applications: owner has full access; nobody else (anon/other authed = nothing)
create policy applications_owner_all on public.applications
  for all to authenticated
  using (public.is_job_owner())
  with check (public.is_job_owner());

-- application_notes: same
create policy application_notes_owner_all on public.application_notes
  for all to authenticated
  using (public.is_job_owner())
  with check (public.is_job_owner());

-- Note: the job-hunter routine writes with the service-role key, which bypasses
-- RLS entirely. These policies only gate the browser anon-key client.
