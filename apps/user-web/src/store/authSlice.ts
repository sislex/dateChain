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
}

const STORAGE_KEY = "datechain.auth";

function loadInitial(): AuthState {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) return JSON.parse(raw) as AuthState;
  } catch {
    /* ignore corrupt storage */
  }
  return { accessToken: null, refreshToken: null, user: null };
}

function persist(state: AuthState): void {
  try {
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
      action: PayloadAction<{ accessToken: string; refreshToken: string; user: AuthUser }>,
    ) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      persist(state);
    },
    setTokens(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      persist(state);
    },
    logout(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      persist(state);
    },
  },
});

export const { setCredentials, setTokens, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;

export const selectIsAuthenticated = (s: { auth: AuthState }): boolean =>
  Boolean(s.auth.accessToken);
export const selectCurrentUser = (s: { auth: AuthState }): AuthUser | null => s.auth.user;
