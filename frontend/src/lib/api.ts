// Centralised API client.
// - Reads tokens from localStorage so a hard refresh keeps the user logged in.
// - On 401, transparently refreshes once and replays the original request.
// - Single in-flight refresh promise to avoid stampedes when many requests
//   401 simultaneously.

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { TokenPair } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_BASE = `${API_URL}/api/v1`;

const ACCESS_KEY = 'nyaya_access_token';
const REFRESH_KEY = 'nyaya_refresh_token';

export const tokenStore = {
  get access() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  set(pair: TokenPair) {
    localStorage.setItem(ACCESS_KEY, pair.access_token);
    localStorage.setItem(REFRESH_KEY, pair.refresh_token);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.access;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight refresh
let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = tokenStore.refresh;
  if (!refresh) throw new Error('No refresh token');

  const { data } = await axios.post<TokenPair>(`${API_BASE}/auth/refresh`, {
    refresh_token: refresh,
  });
  tokenStore.set(data);
  return data.access_token;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    const status = error.response?.status;

    // Don't try to refresh on the refresh or login endpoints themselves.
    const url = original?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status === 401 && !original._retried && !isAuthEndpoint && tokenStore.refresh) {
      original._retried = true;
      try {
        if (!refreshInFlight) {
          refreshInFlight = refreshAccessToken().finally(() => {
            refreshInFlight = null;
          });
        }
        const newToken = await refreshInFlight;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        tokenStore.clear();
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// ─── Strongly-typed endpoint helpers ─────────────────────────────
import type {
  AuthResponse, Case, CaseHistory, DashboardStats, Document,
  Hearing, Notification, PrecedentSearchResponse, User, UserRole, CaseStatus,
} from '@/types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),
  register: (body: {
    email: string; password: string; full_name: string;
    phone?: string; role: UserRole;
    bar_council_id?: string; court_id?: string; designation?: string;
  }) => api.post<AuthResponse>('/auth/register', body).then((r) => r.data),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
};

export const dashboardApi = {
  fetch: () => api.get<DashboardStats>('/dashboard').then((r) => r.data),
};

export const caseApi = {
  list: (params?: { status?: CaseStatus; q?: string; limit?: number; offset?: number }) =>
    api.get<Case[]>('/cases', { params }).then((r) => r.data),
  get: (id: string) => api.get<Case>(`/cases/${id}`).then((r) => r.data),
  create: (body: Partial<Case> & { title: string; category: string; filed_on: string; court_name: string }) =>
    api.post<Case>('/cases', body).then((r) => r.data),
  update: (id: string, body: Partial<Case>) =>
    api.patch<Case>(`/cases/${id}`, body).then((r) => r.data),
  changeStatus: (id: string, new_status: CaseStatus, note?: string) =>
    api.post<Case>(`/cases/${id}/status`, { new_status, note }).then((r) => r.data),
  history: (id: string) =>
    api.get<CaseHistory[]>(`/cases/${id}/history`).then((r) => r.data),
};

export const hearingApi = {
  list: (params?: { case_id?: string; from?: string; to?: string }) =>
    api.get<Hearing[]>('/hearings', { params }).then((r) => r.data),
  create: (body: {
    case_id: string; scheduled_at: string; duration_minutes?: number;
    courtroom?: string; purpose: string;
  }) => api.post<Hearing>('/hearings', body).then((r) => r.data),
  predict: (case_id: string) =>
    api.get<{ predicted_date: string; confidence: number; based_on_hearings: number }>(
      `/hearings/predict-next/${case_id}`,
    ).then((r) => r.data),
};

export const documentApi = {
  list: (case_id?: string) =>
    api.get<Document[]>('/documents', { params: { case_id } }).then((r) => r.data),
  upload: (file: File, opts?: { case_id?: string; kind?: string }) => {
    const fd = new FormData();
    fd.append('file', file);
    if (opts?.case_id) fd.append('case_id', opts.case_id);
    if (opts?.kind) fd.append('kind', opts.kind);
    return api.post<Document>('/documents', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  downloadUrl: (id: string) =>
    api.get<{ url: string }>(`/documents/${id}/download-url`).then((r) => r.data),
};

export const aiApi = {
  precedentSearch: (query: string, top_k = 5) =>
    api.post<PrecedentSearchResponse>('/ai/precedent-search', { query, top_k }).then((r) => r.data),
  summarize: (document_id: string) =>
    api.post<{ summary: string }>(`/ai/documents/${document_id}/summarize`).then((r) => r.data),
};

export const notificationApi = {
  list: (unread_only = false) =>
    api.get<Notification[]>('/notifications', { params: { unread_only } }).then((r) => r.data),
  markRead: (id: string) => api.post(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.post('/notifications/read-all').then((r) => r.data),
};

export const adminApi = {
  listUsers: (role?: UserRole) =>
    api.get<User[]>('/admin/users', { params: { role } }).then((r) => r.data),
  toggleActive: (id: string) =>
    api.post<User>(`/admin/users/${id}/toggle-active`).then((r) => r.data),
  verify: (id: string) =>
    api.post<User>(`/admin/users/${id}/verify`).then((r) => r.data),
  analytics: () => api.get('/admin/analytics').then((r) => r.data),
};
