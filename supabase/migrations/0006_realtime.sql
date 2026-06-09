-- 0006_realtime.sql — broadcast leads/notes changes so the board live-updates.
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.notes;
