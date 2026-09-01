-- 0004_seed.sql — starter habits covering every domain so the first Daily Quest is
-- not empty. These are ordinary rows; edit or archive them in the app.

insert into hq.habits (name, domain, cadence, weekdays, target_per_week, target_count, xp_value, sort_order)
values
  ('Gym',                  'physical',     'n_per_week', null, 4,    1,     40, 10),
  ('10,000 steps',         'physical',     'daily',      null, null, 10000, 30, 20),
  ('Read 30 minutes',      'intellectual', 'daily',      null, null, 1,     30, 30),
  ('Scripture & prayer',   'spiritual',    'daily',      null, null, 1,     25, 40),
  ('Reach out to someone', 'social',       'weekdays',   '{1,2,3,4,5}', null, 1, 25, 50),
  ('Instrument practice',  'musical',      'daily',      null, null, 1,     35, 60),
  ('Log the day''s spend', 'financial',    'daily',      null, null, 1,     20, 70),
  ('Undistracted time together', 'marital', 'daily',      null, null, 1,     35, 80),
  ('Date night',           'marital',      'n_per_week', null, 1,    1,     50, 90)
on conflict do nothing;
