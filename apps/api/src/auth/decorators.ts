import type { UserRole } from "@datechain/types";
import { SetMetadata, createParamDecorator, type ExecutionContext } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const ROLES_KEY = "roles";

/** Marks a route as accessible without authentication. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restricts a route to the given roles (or higher, per ROLE_RANK). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
}

/** Injects the authenticated user attached by JwtStrategy. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
