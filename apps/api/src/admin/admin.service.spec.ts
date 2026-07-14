import { UserStatus } from "../users/user.entity";

import { AdminService } from "./admin.service";

function countRepo(n: number) {
  return { count: jest.fn().mockResolvedValue(n) };
}

describe("AdminService", () => {
  it("aggregates platform metrics from the repositories", async () => {
    const users = { count: jest.fn().mockResolvedValueOnce(100).mockResolvedValueOnce(4) };
    const service = new AdminService(
      users as never,
      {} as never,
      {} as never,
      countRepo(20) as never,
      countRepo(500) as never,
      countRepo(300) as never,
      countRepo(7) as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const metrics = await service.metrics();
    expect(metrics).toEqual({
      totalUsers: 100,
      bannedUsers: 4,
      totalMatches: 20,
      totalMessages: 500,
      totalSwipes: 300,
      openReports: 7,
    });
  });

  it("writes an audit entry and revokes tokens when banning a user", async () => {
    const user = { id: "u1", role: "USER", status: UserStatus.Active };
    const users = {
      findOne: jest.fn().mockResolvedValue(user),
      save: jest.fn().mockResolvedValue(user),
    };
    const audits = { create: jest.fn((p: object) => p), save: jest.fn().mockResolvedValue({}) };
    const tokens = { revokeAllForUser: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminService(
      users as never,
      audits as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      tokens as never,
      {} as never,
      {} as never,
    );

    await service.setStatus("admin1", "u1", UserStatus.Banned);
    expect(tokens.revokeAllForUser).toHaveBeenCalledWith("u1");
    expect(audits.save).toHaveBeenCalled();
  });

  it("impersonate issues the user's token pair, returns contacts and audits the actor", async () => {
    const user = {
      id: "u1",
      role: "USER",
      email: null,
      phone: "+79990000101",
      status: UserStatus.Active,
    };
    const users = { findOne: jest.fn().mockResolvedValue(user) };
    const audits = { create: jest.fn((p: object) => p), save: jest.fn().mockResolvedValue({}) };
    const tokens = {
      issueTokenPair: jest.fn().mockResolvedValue({ accessToken: "acc", refreshToken: "ref" }),
    };
    const service = new AdminService(
      users as never,
      audits as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      tokens as never,
      {} as never,
      {} as never,
    );

    const result = await service.impersonate("admin1", "u1");
    expect(tokens.issueTokenPair).toHaveBeenCalledWith(user);
    expect(result.user).toEqual({ id: "u1", role: "USER", email: null, phone: "+79990000101" });
    expect(result.tokens.accessToken).toBe("acc");
    expect(audits.save).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.impersonate", actorId: "admin1" }),
    );
  });
});
