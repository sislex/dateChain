import type { UserRole } from "@datechain/types";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAppSelector } from "../store";
import { hasRank, selectIsStaff, selectRole } from "../store/authSlice";

/** Gate for admin routes: requires an authenticated staff member (optionally a min role). */
export function RoleGuard({ children, min }: { children: ReactNode; min?: UserRole }) {
  const isStaff = useAppSelector(selectIsStaff);
  const role = useAppSelector(selectRole);
  if (!isStaff) return <Navigate to="/login" replace />;
  if (min && !hasRank(role, min)) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
