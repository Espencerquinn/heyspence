-- 0005_photo_award_once.sql — cap progress-photo EXP at one award per day.
-- Mirrors the existing partial unique index that already covers quest_bonus and
-- journal. Without it, the once-per-day rule is enforced only in the client.
drop index if exists hq.xp_events_daily_once_idx;
create unique index xp_events_daily_once_idx
  on hq.xp_events (kind, occurred_on)
  where kind in ('quest_bonus', 'journal', 'photo');
