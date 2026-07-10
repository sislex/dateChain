import { UserRole } from "@datechain/types";
import { UnauthorizedException } from "@nestjs/common";
import { hash } from "bcryptjs";

import { UserStatus, type User } from "../users/user.entity";

import { AuthService } from "./auth.service";
import { OtpChannel } from "./dto";

const baseUser: User = {
  id: "u1",
  email: null,
  phone: "+15550001111",
  role: UserRole.User,
  status: UserStatus.Active,
  passwordHash: null,
  twoFactorSecret: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function setup() {
  const users = {
    findOrCreateByContact: jest.fn().mockResolvedValue(baseUser),
    findById: jest.fn().mockResolvedValue(baseUser),
    findByEmailWithSecrets: jest.fn(),
  };
  const otp = { request: jest.fn(), verify: jest.fn() };
  const tokens = {
    issueTokenPair: jest
      .fn()
      .mockResolvedValue({ accessToken: "a", refreshToken: "r", expiresIn: 900 }),
    peek: jest.fn(),
    rotate: jest.fn().mockResolvedValue({ accessToken: "a2", refreshToken: "r2", expiresIn: 900 }),
  };
  const totp = { verify: jest.fn() };
  const service = new AuthService(users as never, otp as never, tokens as never, totp as never);
  return { service, users, otp, tokens, totp };
}

describe("AuthService", () => {
  describe("verifyOtp", () => {
    it("issues tokens when the code is valid", async () => {
      const { service, otp, tokens } = setup();
      otp.verify.mockResolvedValue(true);
      const result = await service.verifyOtp(OtpChannel.Phone, "+15550001111", "123456");
      expect(result.tokens.accessToken).toBe("a");
      expect(result.user.id).toBe("u1");
      expect(tokens.issueTokenPair).toHaveBeenCalled();
    });

    it("throws when the code is invalid", async () => {
      const { service, otp } = setup();
      otp.verify.mockResolvedValue(false);
      await expect(
        service.verifyOtp(OtpChannel.Phone, "+15550001111", "000000"),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("refresh", () => {
    it("rotates when the token maps to a user", async () => {
      const { service, tokens } = setup();
      tokens.peek.mockResolvedValue({ userId: "u1" });
      const pair = await service.refresh("raw");
      expect(pair.accessToken).toBe("a2");
      expect(tokens.rotate).toHaveBeenCalledWith("raw", baseUser);
    });

    it("throws when the token is unknown", async () => {
      const { service, tokens } = setup();
      tokens.peek.mockResolvedValue(null);
      await expect(service.refresh("raw")).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("adminLogin", () => {
    it("issues tokens for a valid admin without 2FA", async () => {
      const { service, users } = setup();
      users.findByEmailWithSecrets.mockResolvedValue({
        ...baseUser,
        role: UserRole.Admin,
        passwordHash: await hash("secret", 4),
        twoFactorSecret: null,
      });
      const result = await service.adminLogin("admin@dc.io", "secret");
      expect(result.tokens.accessToken).toBe("a");
    });

    it("requires a valid TOTP when 2FA is enabled", async () => {
      const { service, users, totp } = setup();
      users.findByEmailWithSecrets.mockResolvedValue({
        ...baseUser,
        role: UserRole.Admin,
        passwordHash: await hash("secret", 4),
        twoFactorSecret: "SECRET",
      });
      totp.verify.mockReturnValue(false);
      await expect(service.adminLogin("admin@dc.io", "secret", "000000")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      totp.verify.mockReturnValue(true);
      await expect(service.adminLogin("admin@dc.io", "secret", "123456")).resolves.toBeTruthy();
    });

    it("rejects a wrong password", async () => {
      const { service, users } = setup();
      users.findByEmailWithSecrets.mockResolvedValue({
        ...baseUser,
        role: UserRole.Admin,
        passwordHash: await hash("secret", 4),
      });
      await expect(service.adminLogin("admin@dc.io", "wrong")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("rejects a non-admin account", async () => {
      const { service, users } = setup();
      users.findByEmailWithSecrets.mockResolvedValue({
        ...baseUser,
        role: UserRole.User,
        passwordHash: await hash("secret", 4),
      });
      await expect(service.adminLogin("user@dc.io", "secret")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
