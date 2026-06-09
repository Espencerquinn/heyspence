-- 0005_offers.sql — distinguish offers from inquiries on the board.
create type lead_kind as enum ('inquiry', 'offer');

alter table public.leads add column kind lead_kind not null default 'inquiry';
-- offer-only details (null for inquiries): { amount, earnest, financing, desired_closing, message, attachment_url }
alter table public.leads add column offer_details jsonb;

create index leads_kind_idx on public.leads (kind);
