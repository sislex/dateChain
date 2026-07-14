import { UserRole } from "@datechain/types";
import { beforeEach, describe, expect, it } from "vitest";

import {
  authReducer,
  logout,
  selectIsAuthenticated,
  selectIsImpersonated,
  setCredentials,
  setTokens,
  type AuthState,
} from "./authSlice";

const empty: AuthState = { accessToken: null, refreshToken: null, user: null };

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

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

  describe("impersonation", () => {
    const impersonate = () =>
      authReducer(
        empty,
        setCredentials({
          accessToken: "a",
          refreshToken: "r",
          user: { id: "u1", role: UserRole.User },
          impersonated: true,
        }),
      );

    it("marks the session and persists it per-tab (sessionStorage only)", () => {
      const state = impersonate();
      expect(selectIsImpersonated({ auth: state })).toBe(true);
      expect(sessionStorage.getItem("datechain.auth")).toContain('"impersonated":true');
      expect(localStorage.getItem("datechain.auth")).toBeNull();
    });

    it("a personal login stays in localStorage and is not impersonated", () => {
      const state = authReducer(
        empty,
        setCredentials({
          accessToken: "a",
          refreshToken: "r",
          user: { id: "u1", role: UserRole.User },
        }),
      );
      expect(selectIsImpersonated({ auth: state })).toBe(false);
      expect(localStorage.getItem("datechain.auth")).not.toBeNull();
      expect(sessionStorage.getItem("datechain.auth")).toBeNull();
    });

    it("impersonated logout drops only the tab session, keeping the personal one", () => {
      localStorage.setItem("datechain.auth", JSON.stringify({ accessToken: "personal" }));
      const state = impersonate();
      const out = authReducer(state, logout());
      expect(selectIsAuthenticated({ auth: out })).toBe(false);
      expect(sessionStorage.getItem("datechain.auth")).toBeNull();
      expect(localStorage.getItem("datechain.auth")).toContain("personal");
    });

    it("personal logout clears both storages", () => {
      sessionStorage.setItem("datechain.auth", JSON.stringify({ accessToken: "stale" }));
      const logged = authReducer(
        empty,
        setCredentials({
          accessToken: "a",
          refreshToken: "r",
          user: { id: "u1", role: UserRole.User },
        }),
      );
      authReducer(logged, logout());
      expect(sessionStorage.getItem("datechain.auth")).toBeNull();
      expect(localStorage.getItem("datechain.auth")).toBeNull();
    });
  });
});
