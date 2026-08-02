// Auth state in Zustand. We don't persist the user object itself —
// on app boot we re-fetch /auth/me, so revocations take effect immediately.

import { create } from 'zustand';
import type { User } from '@/types';
import { authApi, tokenStore } from '@/lib/api';

interface AuthState {
  user: User | null;
  loading: boolean;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (body: Parameters<typeof authApi.register>[0]) => Promise<User>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  hydrated: false,

  async login(email, password) {
    set({ loading: true });
    try {
      const res = await authApi.login(email, password);
      tokenStore.set(res.tokens);
      set({ user: res.user });
      return res.user;
    } finally {
      set({ loading: false });
    }
  },

  async register(body) {
    set({ loading: true });
    try {
      const res = await authApi.register(body);
      tokenStore.set(res.tokens);
      set({ user: res.user });
      return res.user;
    } finally {
      set({ loading: false });
    }
  },

  logout() {
    tokenStore.clear();
    set({ user: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  },

  async hydrate() {
    if (!tokenStore.access) {
      set({ hydrated: true });
      return;
    }
    try {
      const user = await authApi.me();
      set({ user, hydrated: true });
    } catch {
      tokenStore.clear();
      set({ user: null, hydrated: true });
    }
  },
}));
