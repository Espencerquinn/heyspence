-- 0010_applications_realtime.sql — broadcast changes so the job board live-updates.
alter publication supabase_realtime add table public.applications;
alter publication supabase_realtime add table public.application_notes;
