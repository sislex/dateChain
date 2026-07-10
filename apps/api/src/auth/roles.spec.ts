import { UserRole } from "@datechain/types";

import { hasSufficientRole } from "./roles";

describe("hasSufficientRole", () => {
  it("admits an exact role match", () => {
    expect(hasSufficientRole(UserRole.Moderator, [UserRole.Moderator])).toBe(true);
  });

  it("admits a higher-ranked role (admin satisfies moderator requirement)", () => {
    expect(hasSufficientRole(UserRole.Admin, [UserRole.Moderator])).toBe(true);
    expect(hasSufficientRole(UserRole.SuperAdmin, [UserRole.Admin])).toBe(true);
  });

  it("rejects a lower-ranked role", () => {
    expect(hasSufficientRole(UserRole.User, [UserRole.Moderator])).toBe(false);
    expect(hasSufficientRole(UserRole.Support, [UserRole.Admin])).toBe(false);
  });

  it("admits everyone when no role is required", () => {
    expect(hasSufficientRole(UserRole.User, [])).toBe(true);
  });

  it("uses the lowest required rank when several are listed", () => {
    expect(hasSufficientRole(UserRole.Support, [UserRole.Admin, UserRole.Support])).toBe(true);
  });
});
