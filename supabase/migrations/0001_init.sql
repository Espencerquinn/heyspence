-- 0001_init.sql

-- Pipeline stages, in board order. 'Lost' is terminal/parallel.
create type lead_status as enum (
  'New', 'Contacted', 'Showing Scheduled', 'Following Up', 'Offer', 'Closed', 'Lost'
);

create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text not null,
  interest    text not null,
  status      lead_status not null default 'New',
  source      text not null default 'website form',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.notes (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references public.leads(id) on delete cascade,
  author_email text not null,
  author_name  text not null,
  body         text not null,
  created_at   timestamptz not null default now()
);

create table public.allowed_users (
  email        text primary key,
  display_name text not null
);

insert into public.allowed_users (email, display_name) values
  ('espencer.quinn@gmail.com', 'Spencer'),
  ('carissaquinn02@gmail.com', 'Carissa'),
  ('morganeadsrealestate@gmail.com', 'Morgan');

-- bump updated_at on any row change (this is how status moves get a timestamp)
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_touch_updated_at
  before update on public.leads
  for each row execute function public.touch_updated_at();

create index notes_lead_id_created_at_idx on public.notes (lead_id, created_at desc);
create index leads_updated_at_idx on public.leads (updated_at desc);
