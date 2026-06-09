export const STATUSES = [
  'New', 'Contacted', 'Showing Scheduled', 'Following Up', 'Offer', 'Closed', 'Lost',
] as const;
export type Status = typeof STATUSES[number];

export type Kind = 'inquiry' | 'offer';

export interface OfferDetails {
  amount?: string;
  earnest?: string;
  financing?: string;
  desired_closing?: string;
  message?: string;
  attachment_url?: string | null;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  status: Status;
  kind: Kind;
  offer_details: OfferDetails | null;
  source: string;
  created_at: string;
  updated_at: string;
}

// An offer is "active" (lives in the Offers lane) until it's resolved to Closed/Lost.
export function isActiveOffer(l: Lead): boolean {
  return l.kind === 'offer' && l.status !== 'Closed' && l.status !== 'Lost';
}

export interface Note {
  id: string;
  lead_id: string;
  author_email: string;
  author_name: string;
  body: string;
  created_at: string;
}
