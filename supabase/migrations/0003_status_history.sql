-- 0003_status_history.sql
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
