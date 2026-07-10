/**
 * Shared domain types for dateChain.
 *
 * This package is the single source of truth for DTOs/enums shared between
 * backend and frontends. In Phase 2.2 most of these will be generated from the
 * backend OpenAPI schema; hand-written primitives live here.
 */

/** User roles used for RBAC across the platform. */
export enum UserRole {
  User = "USER",
  Support = "SUPPORT",
  Analyst = "ANALYST",
  Moderator = "MODERATOR",
  Admin = "ADMIN",
  SuperAdmin = "SUPER_ADMIN",
}

/** Gender options shown during onboarding and used in discovery filters. */
export enum Gender {
  Man = "MAN",
  Woman = "WOMAN",
  More = "MORE",
}

/** Direction of a swipe action. */
export enum SwipeAction {
  Nope = "NOPE",
  Like = "LIKE",
  SuperLike = "SUPER_LIKE",
}

/** ISO-8601 timestamp string, e.g. "2026-07-10T12:00:00.000Z". */
export type IsoDateString = string;

export const APP_NAME = "dateChain";
