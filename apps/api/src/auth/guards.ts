import type { UserRole } from "@datechain/types";
import { ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { CanActivate } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";

import { IS_PUBLIC_KEY, ROLES_KEY, type AuthenticatedUser } from "./decorators";
import { hasSufficientRole } from "./roles";

/** JWT guard that lets @Public() routes through without a token. */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}

/** Enforces @Roles() metadata against the authenticated user's role rank. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as AuthenticatedUser | undefined;
    if (!user) throw new ForbiddenException("Missing authenticated user");
    if (!hasSufficientRole(user.role, required)) {
      throw new ForbiddenException("Insufficient role");
    }
    return true;
  }
}
