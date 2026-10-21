/** The seven life domains. Fixed — matches the `hq.domain` Postgres enum. */
export type Domain =
  | 'physical' | 'intellectual' | 'spiritual' | 'social' | 'musical' | 'financial'
  | 'marital';

/** RPG stat abbreviation shown in the stat block. */
export type StatKey = 'STR' | 'INT' | 'WIS' | 'CHA' | 'SENSE' | 'FOR' | 'BND';

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type Cadence = 'daily' | 'weekdays' | 'n_per_week';
/** 'medication' and 'supplement' render in the Morning Protocol, ahead of the quest. */
export type HabitKind = 'habit' | 'medication' | 'supplement';
/** Synced health data that can tick a habit on its own. */
export type AutoSource = 'steps' | 'workout' | 'strength';
export type XpKind =
  | 'habit' | 'task' | 'journal' | 'milestone' | 'goal' | 'photo'
  | 'quest_bonus' | 'penalty';
export type Pose = 'front' | 'side' | 'back' | 'other';
export type GoalStatus = 'active' | 'done' | 'dropped';
export type TaskStatus = 'open' | 'done' | 'dropped';

export const DOMAINS: readonly Domain[] = [
  'physical', 'intellectual', 'spiritual', 'social', 'musical', 'financial', 'marital',
] as const;

export const STAT_KEYS: readonly StatKey[] = [
  'STR', 'INT', 'WIS', 'CHA', 'SENSE', 'FOR', 'BND',
] as const;

export const STAT_OF: Record<Domain, StatKey> = {
  physical: 'STR',
  intellectual: 'INT',
  spiritual: 'WIS',
  social: 'CHA',
  musical: 'SENSE',
  financial: 'FOR',
  marital: 'BND',
};

export const DOMAIN_OF: Record<StatKey, Domain> = {
  STR: 'physical',
  INT: 'intellectual',
  WIS: 'spiritual',
  CHA: 'social',
  SENSE: 'musical',
  FOR: 'financial',
  BND: 'marital',
};

export const DOMAIN_COLOR: Record<Domain, string> = {
  physical: '#5ad8ff',
  intellectual: '#7f9cff',
  spiritual: '#b28cff',
  social: '#4fe3b0',
  musical: '#ff9ad5',
  financial: '#ffc46b',
  marital: '#ff7a6b',
};

export const DOMAIN_LABEL: Record<Domain, string> = {
  physical: 'Physical',
  intellectual: 'Intellect',
  spiritual: 'Spirit',
  social: 'Social',
  musical: 'Music',
  financial: 'Money',
  marital: 'Marriage',
};

/* ---------- row types (mirror the hq schema exactly) ---------- */

export interface Habit {
  id: string;
  name: string;
  domain: Domain;
  cadence: Cadence;
  weekdays: number[] | null;   // 0=Sun..6=Sat, only for cadence 'weekdays'
  target_per_week: number | null; // only for cadence 'n_per_week'
  target_count: number;        // e.g. 10000 for steps; 1 for a simple check
  xp_value: number;
  sort_order: number;
  archived_at: string | null;
  // Added in 0007. Optional here so pure-logic fixtures need not spell them out;
  // rows from the DB always carry them.
  kind?: HabitKind;
  dose?: string | null;        // "40 units", "2 clicks"
  notes?: string | null;
  auto_source?: AutoSource | null;
  active_from?: string | null; // YYYY-MM-DD; never due before this day
}

export interface HabitLog {
  habit_id: string;
  log_date: string;            // YYYY-MM-DD
  count: number;
  created_at?: string;         // first tick that day — "taken at" for protocol items
}

export interface Goal {
  id: string;
  domain: Domain;
  title: string;
  detail: string | null;
  target_date: string | null;
  status: GoalStatus;
  completed_at: string | null;
}

export interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  sort_order: number;
  done_at: string | null;
}

export interface Task {
  id: string;
  domain: Domain;
  goal_id: string | null;
  title: string;
  notes: string | null;
  due_date: string | null;
  is_focus: boolean;
  status: TaskStatus;
  completed_at: string | null;
}

export interface JournalEntry {
  entry_date: string;
  body: string;
  mood: number | null;         // 1..5
  energy: number | null;       // 1..5
  lesson: string | null;
}

export interface ProgressPhoto {
  id: string;
  taken_on: string;
  pose: Pose;
  storage_path: string;
  weight_lb: number | null;
  bodyfat_pct: number | null;
  note: string | null;
}

export interface XpEvent {
  id: string;
  domain: Domain | null;       // null for whole-player events (quest bonus, penalty)
  amount: number;              // negative for penalties
  kind: XpKind;
  ref_id: string | null;
  occurred_on: string;
}

export interface TitleRow {
  code: string;
  unlocked_at: string;
}

export interface Penalty {
  penalty_date: string;
  missed_habit_ids: string[];
  xp_lost: number;             // stored positive
  streak_before: number;
}

/* ---------- vitality (0007): health sync + fuel ---------- */

export interface HealthDaily {
  metric_date: string;         // YYYY-MM-DD, the phone's local day
  metric: string;              // 'steps' | 'active_kcal' | 'sleep_hours' | 'resting_hr' | ...
  value: number;
  unit: string | null;
  updated_at: string;
}

export interface Workout {
  id: string;
  name: string;                // "Traditional Strength Training"
  source: string | null;       // "Tonal"
  started_at: string;
  workout_date: string;
  duration_min: number | null;
  active_kcal: number | null;
  avg_hr: number | null;
}

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodSource = 'manual' | 'off' | 'usda' | 'ai' | 'repeat';

export interface FoodEntry {
  id: string;
  eaten_on: string;
  meal: Meal;
  name: string;
  servings: number;
  // per serving
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  serving_label: string | null;
  source: FoodSource;
  source_ref: string | null;
  created_at: string;
}

export interface MacroTargets {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}
