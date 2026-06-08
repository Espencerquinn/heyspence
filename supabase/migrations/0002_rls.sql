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
