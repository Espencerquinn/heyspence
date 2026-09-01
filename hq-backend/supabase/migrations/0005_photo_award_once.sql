-- 0005_photo_award_once.sql — cap progress-photo EXP at one award per day.
-- No such coverage exists yet for quest_bonus or journal either; this migration
-- is what creates the (kind, occurred_on) index for all three. Until it is
-- applied, the once-per-day rule for quest_bonus, journal, and photo is
-- enforced only in the client.
drop index if exists hq.xp_events_daily_once_idx;
create unique index xp_events_daily_once_idx
  on hq.xp_events (kind, occurred_on)
  where kind in ('quest_bonus', 'journal', 'photo');
