export const STATUSES = [
  'Discovered', 'Drafting', 'Ready for Review',
  'Applied', 'Interviewing', 'Offer', 'Rejected', 'Archived',
] as const;
export type Status = typeof STATUSES[number];

export type Source = 'agent' | 'manual';

// Columns shown on the board list. Heavy text fields (job_description,
// fit_summary, tailored_resume, cover_letter) are loaded lazily in the detail
// drawer to keep the board query and realtime payloads light.
export interface Application {
  id: string;
  company: string;
  role_title: string;
  job_url: string;
  location: string | null;
  team: string | null;
  fit_score: number | null;
  status: Status;
  source: Source;
  created_at: string;
  updated_at: string;

  // Heavy fields — present only after fetchApplicationDetail().
  greenhouse_id?: number | null;
  salary_range?: string | null;
  job_description?: string | null;
  fit_summary?: string | null;
  tailored_resume?: string | null;
  cover_letter?: string | null;
}

// A row is awaiting the agent's draft until it has a tailored resume.
export function isQueuedForDrafting(a: Application): boolean {
  return !a.tailored_resume && (a.status === 'Discovered' || a.status === 'Drafting');
}

export interface ApplicationNote {
  id: string;
  application_id: string;
  author_email: string;
  author_name: string;
  body: string;
  created_at: string;
}
