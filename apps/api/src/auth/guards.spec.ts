import { UserRole } from "@datechain/types";
import { ForbiddenException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { JwtAuthGuard, RolesGuard } from "./guards";

function contextWith(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe("JwtAuthGuard", () => {
  it("lets @Public() routes through without authentication", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    expect(guard.canActivate(contextWith(undefined))).toBe(true);
  });
});

describe("RolesGuard", () => {
  it("allows the request when no roles are required", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(contextWith({ userId: "u", role: UserRole.User }))).toBe(true);
  });

  it("allows a user whose role rank meets the requirement", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.Moderator]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(contextWith({ userId: "u", role: UserRole.Admin }))).toBe(true);
  });

  it("forbids a user whose role rank is too low", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.Admin]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(contextWith({ userId: "u", role: UserRole.User }))).toThrow(
      ForbiddenException,
    );
  });

  it("forbids when no authenticated user is present", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.Admin]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(ForbiddenException);
  });
});
