-- 0004_cron.sql
-- 7 AM America/Denver = 13:00 UTC (MDT) or 14:00 UTC (MST). Schedule both;
-- the function's denverHour()===7 guard ensures it actually sends only once/day.
-- The anon key below is the public/publishable key (safe to commit; also ships in the web bundle).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'daily-digest-mdt', '0 13 * * *',
  $$ select net.http_post(
       url := 'https://blbeomcshzqabprvbygd.supabase.co/functions/v1/daily-digest',
       headers := '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsYmVvbWNzaHpxYWJwcnZieWdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTE0NTgsImV4cCI6MjA5NjUyNzQ1OH0.QmfBHPbsM-UhF1dhyFL807z3H578ndHAtyROKppdzIM","Content-Type":"application/json"}'::jsonb
     ); $$
);
select cron.schedule(
  'daily-digest-mst', '0 14 * * *',
  $$ select net.http_post(
       url := 'https://blbeomcshzqabprvbygd.supabase.co/functions/v1/daily-digest',
       headers := '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsYmVvbWNzaHpxYWJwcnZieWdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTE0NTgsImV4cCI6MjA5NjUyNzQ1OH0.QmfBHPbsM-UhF1dhyFL807z3H578ndHAtyROKppdzIM","Content-Type":"application/json"}'::jsonb
     ); $$
);
