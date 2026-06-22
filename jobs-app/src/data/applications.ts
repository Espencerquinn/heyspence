import { supabase } from '../supabaseClient';
import { DEMO, DEMO_APPLICATIONS } from '../demo';
import type { Application, Status } from '../types';

// Light columns for the board list (omit the big text fields).
const LIST_COLUMNS =
  'id,company,role_title,job_url,location,team,fit_score,status,source,created_at,updated_at';

export async function fetchApplications(): Promise<Application[]> {
  if (DEMO) return DEMO_APPLICATIONS.map((a) => ({ ...a }));
  const { data, error } = await supabase
    .from('applications').select(LIST_COLUMNS).order('updated_at', { ascending: false });
  if (error) throw error;
  return data as Application[];
}

// Full row incl. JD, fit summary, tailored resume and cover letter (detail drawer).
export async function fetchApplicationDetail(id: string): Promise<Application> {
  if (DEMO) return { ...DEMO_APPLICATIONS.find((a) => a.id === id)! };
  const { data, error } = await supabase
    .from('applications').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Application;
}

export async function updateApplicationStatus(id: string, status: Status): Promise<void> {
  if (DEMO) { const a = DEMO_APPLICATIONS.find((x) => x.id === id); if (a) a.status = status; return; }
  const { error } = await supabase.from('applications').update({ status }).eq('id', id);
  if (error) throw error;
}

// Owner-editable fields only (whitelisted — the agent owns the rest).
export type EditableFields = Partial<
  Pick<Application, 'role_title' | 'location' | 'team' | 'salary_range' | 'tailored_resume' | 'cover_letter'>
>;
export async function updateApplicationFields(id: string, fields: EditableFields): Promise<void> {
  if (DEMO) { const a = DEMO_APPLICATIONS.find((x) => x.id === id); if (a) Object.assign(a, fields); return; }
  const { error } = await supabase.from('applications').update(fields).eq('id', id);
  if (error) throw error;
}

// On-demand add: insert a Discovered/manual row from a pasted URL. The job-hunter
// routine backfills role_title/location/JD and drafts on its next run.
export async function insertManualApplication(jobUrl: string): Promise<void> {
  const url = jobUrl.trim();
  if (DEMO) {
    const ts = new Date().toISOString();
    DEMO_APPLICATIONS.unshift({
      id: `demo-${DEMO_APPLICATIONS.length + 1}`, company: 'Unknown', role_title: url,
      job_url: url, location: null, team: null, fit_score: null, status: 'Discovered',
      source: 'manual', created_at: ts, updated_at: ts,
      greenhouse_id: null, salary_range: null, job_description: null,
      fit_summary: null, tailored_resume: null, cover_letter: null,
    });
    return;
  }
  const { error } = await supabase.from('applications').insert({
    job_url: url,
    role_title: url,        // placeholder until the routine backfills the real title
    status: 'Discovered',
    source: 'manual',
  });
  if (error) throw error;
}

export async function deleteApplication(id: string): Promise<void> {
  if (DEMO) { const i = DEMO_APPLICATIONS.findIndex((x) => x.id === id); if (i >= 0) DEMO_APPLICATIONS.splice(i, 1); return; }
  const { error } = await supabase.from('applications').delete().eq('id', id);
  if (error) throw error;
}
