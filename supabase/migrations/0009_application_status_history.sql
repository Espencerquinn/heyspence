-- 0009_application_status_history.sql
-- Mirrors 0003_status_history.sql for applications, so we have an audit trail
-- of pipeline movement (and a hook for any future digest/reporting).

create table public.application_status_history (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  from_status    application_status,
  to_status      application_status not null,
  changed_at     timestamptz not null default now()
);

alter table public.application_status_history enable row level security;
create policy application_status_history_owner_read on public.application_status_history
  for select to authenticated using (public.is_job_owner());

create or replace function public.record_application_status_change() returns trigger as $$
begin
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.application_status_history (application_id, from_status, to_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger applications_record_status_change
  after update on public.applications
  for each row execute function public.record_application_status_change();

create index application_status_history_changed_at_idx
  on public.application_status_history (changed_at desc);
