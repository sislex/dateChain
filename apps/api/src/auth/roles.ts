import { UserRole } from "@datechain/types";

/**
 * Rank ladder for RBAC. A @Roles(X) guard admits any user whose rank is >= the
 * lowest-ranked required role, so higher admin tiers inherit lower permissions.
 */
export const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.User]: 0,
  [UserRole.Analyst]: 10,
  [UserRole.Support]: 20,
  [UserRole.Moderator]: 30,
  [UserRole.Admin]: 40,
  [UserRole.SuperAdmin]: 50,
};

export function hasSufficientRole(actual: UserRole, required: UserRole[]): boolean {
  if (required.length === 0) return true;
  const minRequired = Math.min(...required.map((r) => ROLE_RANK[r]));
  return ROLE_RANK[actual] >= minRequired;
}
