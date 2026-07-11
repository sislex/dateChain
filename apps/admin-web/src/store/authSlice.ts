import { UserRole } from "@datechain/types";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AdminUser {
  id: string;
  role: UserRole;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AdminUser | null;
}

const STORAGE_KEY = "datechain.admin.auth";
const STAFF_RANK: Record<UserRole, number> = {
  [UserRole.User]: 0,
  [UserRole.Analyst]: 10,
  [UserRole.Support]: 20,
  [UserRole.Moderator]: 30,
  [UserRole.Admin]: 40,
  [UserRole.SuperAdmin]: 50,
};

function loadInitial(): AuthState {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) return JSON.parse(raw) as AuthState;
  } catch {
    /* ignore */
  }
  return { accessToken: null, refreshToken: null, user: null };
}

function persist(state: AuthState): void {
  try {
    if (typeof localStorage !== "undefined")
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

const authSlice = createSlice({
  name: "auth",
  initialState: loadInitial(),
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string; user: AdminUser }>,
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

export const selectIsStaff = (s: { auth: AuthState }): boolean =>
  Boolean(
    s.auth.accessToken &&
    s.auth.user &&
    STAFF_RANK[s.auth.user.role] >= STAFF_RANK[UserRole.Analyst],
  );

export const selectRole = (s: { auth: AuthState }): UserRole | null => s.auth.user?.role ?? null;

export function hasRank(role: UserRole | null, min: UserRole): boolean {
  if (!role) return false;
  return STAFF_RANK[role] >= STAFF_RANK[min];
}
