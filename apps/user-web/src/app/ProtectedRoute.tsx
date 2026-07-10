import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAppSelector } from "../store";
import { selectIsAuthenticated } from "../store/authSlice";

/** Redirects unauthenticated users to the welcome/onboarding flow. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const authenticated = useAppSelector(selectIsAuthenticated);
  if (!authenticated) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}
