import { UserRole } from "@datechain/types";

import { AuthController } from "./auth.controller";
import { OtpChannel } from "./dto";

describe("AuthController", () => {
  const auth = {
    requestOtp: jest.fn().mockResolvedValue(undefined),
    verifyOtp: jest.fn().mockResolvedValue({ user: {}, tokens: {} }),
    refresh: jest.fn().mockResolvedValue({}),
    adminLogin: jest.fn().mockResolvedValue({}),
    logout: jest.fn().mockResolvedValue(undefined),
  };
  const controller = new AuthController(auth as never);

  beforeEach(() => jest.clearAllMocks());

  it("requestOtp delegates and returns sent:true", async () => {
    const res = await controller.requestOtp({ channel: OtpChannel.Phone, identifier: "+1555" });
    expect(res).toEqual({ sent: true });
    expect(auth.requestOtp).toHaveBeenCalledWith(OtpChannel.Phone, "+1555");
  });

  it("verifyOtp delegates with code", async () => {
    await controller.verifyOtp({ channel: OtpChannel.Email, identifier: "a@b.co", code: "123456" });
    expect(auth.verifyOtp).toHaveBeenCalledWith(OtpChannel.Email, "a@b.co", "123456");
  });

  it("refresh delegates the raw token", async () => {
    await controller.refresh({ refreshToken: "raw" });
    expect(auth.refresh).toHaveBeenCalledWith("raw");
  });

  it("adminLogin delegates credentials", async () => {
    await controller.adminLogin({ email: "a@dc.io", password: "p", totp: "123456" });
    expect(auth.adminLogin).toHaveBeenCalledWith("a@dc.io", "p", "123456");
  });

  it("logout delegates the raw token", async () => {
    await controller.logout({ refreshToken: "raw" });
    expect(auth.logout).toHaveBeenCalledWith("raw");
  });

  it("me returns the current user", () => {
    const user = { userId: "u1", role: UserRole.User };
    expect(controller.me(user)).toBe(user);
  });
});
