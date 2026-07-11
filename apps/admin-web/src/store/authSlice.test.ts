import { UserRole } from "@datechain/types";
import { describe, expect, it } from "vitest";

import { authReducer, hasRank, selectIsStaff, setCredentials, type AuthState } from "./authSlice";

const empty: AuthState = { accessToken: null, refreshToken: null, user: null };

describe("admin authSlice", () => {
  it("treats analyst+ as staff", () => {
    const state = authReducer(
      empty,
      setCredentials({
        accessToken: "a",
        refreshToken: "r",
        user: { id: "u", role: UserRole.Analyst },
      }),
    );
    expect(selectIsStaff({ auth: state })).toBe(true);
  });

  it("does not treat a plain user as staff", () => {
    const state = authReducer(
      empty,
      setCredentials({
        accessToken: "a",
        refreshToken: "r",
        user: { id: "u", role: UserRole.User },
      }),
    );
    expect(selectIsStaff({ auth: state })).toBe(false);
  });

  it("hasRank enforces the role ladder", () => {
    expect(hasRank(UserRole.Admin, UserRole.Moderator)).toBe(true);
    expect(hasRank(UserRole.Moderator, UserRole.Admin)).toBe(false);
    expect(hasRank(null, UserRole.Analyst)).toBe(false);
  });
});
