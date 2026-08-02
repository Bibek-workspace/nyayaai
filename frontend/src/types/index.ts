// Mirror of backend Pydantic schemas. Keep in sync manually, or generate
// from the FastAPI OpenAPI schema using `openapi-typescript` in a future iteration.

export type UserRole =
  | 'judge' | 'lawyer' | 'litigant' | 'clerk' | 'prosecutor' | 'admin';

export type CaseStatus =
  | 'filed' | 'registered' | 'notice_issued' | 'pleadings'
  | 'evidence' | 'arguments' | 'judgment_reserved' | 'disposed' | 'appealed';

export type CaseCategory =
  | 'civil' | 'criminal' | 'family' | 'constitutional'
  | 'commercial' | 'labour' | 'tax' | 'other';

export type DocumentKind =
  | 'petition' | 'affidavit' | 'evidence' | 'judgment'
  | 'order' | 'notice' | 'precedent' | 'other';

export type HearingStatus = 'scheduled' | 'completed' | 'adjourned' | 'cancelled';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  bar_council_id: string | null;
  court_id: string | null;
  designation: string | null;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

export interface CaseParty {
  id: string;
  role_in_case: string;
  display_name: string;
  user_id: string | null;
}

export interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string | null;
  category: CaseCategory;
  status: CaseStatus;
  filed_on: string;
  court_name: string;
  jurisdiction: string | null;
  filer_id: string;
  judge_id: string | null;
  parties: CaseParty[];
  created_at: string;
  updated_at: string;
}

export interface CaseHistory {
  id: string;
  from_status: CaseStatus | null;
  to_status: CaseStatus;
  changed_by_id: string;
  note: string | null;
  created_at: string;
}

export interface Hearing {
  id: string;
  case_id: string;
  scheduled_at: string;
  duration_minutes: number;
  courtroom: string | null;
  purpose: string;
  status: HearingStatus;
  notes: string | null;
}

export interface Document {
  id: string;
  case_id: string | null;
  uploader_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  kind: DocumentKind;
  ocr_performed: boolean;
  ai_summary: string | null;
  created_at: string;
}

export interface PrecedentHit {
  document_id: string;
  filename: string;
  chunk_content: string;
  similarity: number;
  case_id: string | null;
}

export interface PrecedentSearchResponse {
  query: string;
  answer: string;
  hits: PrecedentHit[];
  elapsed_ms: number;
}

export interface DashboardStats {
  total_cases: number;
  cases_by_status: Record<string, number>;
  cases_by_category: Record<string, number>;
  upcoming_hearings_count: number;
  unread_notifications: number;
  recent_cases: Case[];
  upcoming_hearings: Hearing[];
}

export interface Notification {
  id: string;
  channel: 'in_app' | 'email' | 'sms';
  title: string;
  body: string;
  link_url: string | null;
  read: boolean;
  created_at: string;
}
