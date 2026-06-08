export const STATUSES = [
  'New', 'Contacted', 'Showing Scheduled', 'Following Up', 'Offer', 'Closed', 'Lost',
] as const;
export type Status = typeof STATUSES[number];

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  status: Status;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  lead_id: string;
  author_email: string;
  author_name: string;
  body: string;
  created_at: string;
}
