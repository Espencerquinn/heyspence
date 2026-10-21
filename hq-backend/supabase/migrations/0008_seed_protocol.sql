-- 0008_seed_protocol.sql — Spencer's current protocol and daily reps (2026-10-21).
-- Ordinary habit rows; doses, days and pauses are all editable on the Protocol page.
-- active_from is today so no earlier day is retroactively "missed".

insert into hq.habits
  (name, domain, kind, dose, cadence, weekdays, target_per_week, target_count, xp_value, sort_order, active_from)
select v.name, 'physical', v.kind, v.dose, v.cadence::hq.cadence, v.weekdays, null, v.target_count, v.xp, v.sort, date '2026-10-21'
from (values
  ('HCG',          'medication', '40 units', 'weekdays', '{1,3,5}'::int[], 1,  10, 1),  -- Mon / Wed / Fri
  ('Test Cream',   'medication', '2 clicks', 'daily',    null,             1,  10, 2),
  ('Tirzepatide',  'medication', '25 units', 'weekdays', '{0}'::int[],     1,  10, 3),  -- weekly; Sunday is a placeholder
  ('Fish oil',     'supplement', '1 serving','daily',    null,             1,  10, 4),
  ('Pushups',      'habit',      null,       'daily',    null,             50, 25, 12),
  ('Core circuit', 'habit',      null,       'daily',    null,             1,  25, 14)
) as v(name, kind, dose, cadence, weekdays, target_count, xp, sort)
where not exists (select 1 from hq.habits h where h.name = v.name);

-- Wire the existing seeds to synced health data.
update hq.habits set auto_source = 'steps'    where name = '10,000 steps' and auto_source is null;
update hq.habits set auto_source = 'strength' where name = 'Gym'          and auto_source is null;
