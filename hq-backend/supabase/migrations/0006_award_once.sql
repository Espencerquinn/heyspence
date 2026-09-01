-- 0006_award_once.sql — close every remaining double-award path in the EXP ledger.
-- 0005 covers (kind, occurred_on) for quest_bonus / journal / photo.
-- This covers entity-scoped kinds, which are awarded once per entity, not per day.
create unique index if not exists xp_events_ref_once_idx
  on hq.xp_events (kind, ref_id)
  where kind in ('task', 'milestone', 'goal');
