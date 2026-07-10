import { UserRole } from "@datechain/types";
import { describe, expect, it } from "vitest";

import {
  authReducer,
  logout,
  selectIsAuthenticated,
  setCredentials,
  setTokens,
  type AuthState,
} from "./authSlice";

const empty: AuthState = { accessToken: null, refreshToken: null, user: null };

describe("authSlice", () => {
  it("stores credentials on login", () => {
    const state = authReducer(
      empty,
      setCredentials({
        accessToken: "a",
        refreshToken: "r",
        user: { id: "u1", role: UserRole.User },
      }),
    );
    expect(state.accessToken).toBe("a");
    expect(selectIsAuthenticated({ auth: state })).toBe(true);
  });

  it("rotates tokens without dropping the user", () => {
    const logged = authReducer(
      empty,
      setCredentials({
        accessToken: "a",
        refreshToken: "r",
        user: { id: "u1", role: UserRole.User },
      }),
    );
    const rotated = authReducer(logged, setTokens({ accessToken: "a2", refreshToken: "r2" }));
    expect(rotated.accessToken).toBe("a2");
    expect(rotated.user?.id).toBe("u1");
  });

  it("clears everything on logout", () => {
    const logged = authReducer(
      empty,
      setCredentials({
        accessToken: "a",
        refreshToken: "r",
        user: { id: "u1", role: UserRole.User },
      }),
    );
    const out = authReducer(logged, logout());
    expect(selectIsAuthenticated({ auth: out })).toBe(false);
    expect(out.user).toBeNull();
  });
});
