import type { UserRole } from "@datechain/types";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AuthUser {
  id: string;
  role: UserRole;
  email?: string | null;
  phone?: string | null;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  /** True when this session was opened by an admin via "Войти как". */
  impersonated?: boolean;
}

const STORAGE_KEY = "datechain.auth";

/**
 * Impersonated sessions live in sessionStorage (per-tab) so an admin can open
 * several users side by side without clobbering the personal session in
 * localStorage. A tab's sessionStorage copy wins over the shared one.
 */
function loadInitial(): AuthState {
  try {
    const tabRaw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(STORAGE_KEY) : null;
    if (tabRaw) return JSON.parse(tabRaw) as AuthState;
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) return JSON.parse(raw) as AuthState;
  } catch {
    /* ignore corrupt storage */
  }
  return { accessToken: null, refreshToken: null, user: null };
}

function persist(state: AuthState): void {
  try {
    if (state.impersonated) {
      if (typeof sessionStorage !== "undefined")
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return;
    }
    if (typeof localStorage !== "undefined")
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

const authSlice = createSlice({
  name: "auth",
  initialState: loadInitial(),
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
        impersonated?: boolean;
      }>,
    ) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.impersonated = action.payload.impersonated ?? false;
      persist(state);
    },
    setTokens(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      persist(state);
    },
    logout(state) {
      // An impersonated tab only drops its own session; a personal logout
      // clears both copies so the tab doesn't resurrect a stale session.
      try {
        if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(STORAGE_KEY);
        if (!state.impersonated && typeof localStorage !== "undefined")
          localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* storage unavailable */
      }
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.impersonated = false;
    },
  },
});

export const { setCredentials, setTokens, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;

export const selectIsAuthenticated = (s: { auth: AuthState }): boolean =>
  Boolean(s.auth.accessToken);
export const selectCurrentUser = (s: { auth: AuthState }): AuthUser | null => s.auth.user;
export const selectIsImpersonated = (s: { auth: AuthState }): boolean =>
  Boolean(s.auth.impersonated);
