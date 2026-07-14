import type { UserRole } from "@datechain/types";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useAppDispatch } from "../../store";
import { setCredentials } from "../../store/authSlice";

/**
 * Entry point for admin impersonation: admin-web opens
 * /impersonate#access=…&refresh=…&id=…&role=… and this page installs the
 * session and redirects into the app. Tokens travel in the hash fragment so
 * they never reach the server or logs.
 */
export function ImpersonatePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access");
    const refreshToken = params.get("refresh");
    const id = params.get("id");
    if (!accessToken || !refreshToken || !id) {
      navigate("/welcome", { replace: true });
      return;
    }
    dispatch(
      setCredentials({
        accessToken,
        refreshToken,
        user: {
          id,
          role: (params.get("role") ?? "USER") as UserRole,
          email: params.get("email"),
          phone: params.get("phone"),
        },
        impersonated: true,
      }),
    );
    // Drop the tokens from the address bar before entering the app.
    window.history.replaceState(null, "", "/app");
    navigate("/app", { replace: true });
  }, [dispatch, navigate]);

  return null;
}
