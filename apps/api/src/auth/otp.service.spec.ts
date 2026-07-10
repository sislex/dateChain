import { ConfigService } from "@nestjs/config";

import { OtpService } from "./otp.service";

describe("OtpService", () => {
  const store = new Map<string, string>();
  const redis = {
    set: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve("OK");
    }),
    get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    del: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve(1);
    }),
  };
  const config = { get: jest.fn().mockReturnValue(300) } as unknown as ConfigService;
  const service = new OtpService(redis as never, config);

  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
  });

  it("stores a 6-digit code on request", async () => {
    const code = await service.request("phone", "+15550000000");
    expect(code).toMatch(/^\d{6}$/);
    expect(redis.set).toHaveBeenCalledWith("otp:phone:+15550000000", code, "EX", 300);
  });

  it("verifies a matching code and consumes it", async () => {
    const code = await service.request("email", "a@b.co");
    expect(await service.verify("email", "a@b.co", code)).toBe(true);
    // consumed → second attempt fails
    expect(await service.verify("email", "a@b.co", code)).toBe(false);
  });

  it("rejects a wrong code", async () => {
    await service.request("phone", "+15551112222");
    expect(await service.verify("phone", "+15551112222", "000000")).toBe(false);
  });

  it("rejects when no code was requested", async () => {
    expect(await service.verify("phone", "+15559998888", "123456")).toBe(false);
  });
});
