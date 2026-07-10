import { authenticator } from "otplib";

import { TotpService } from "./totp.service";

describe("TotpService", () => {
  const service = new TotpService();

  it("generates a secret and verifies a matching token", () => {
    const secret = service.generateSecret();
    const token = authenticator.generate(secret);
    expect(service.verify(token, secret)).toBe(true);
  });

  it("rejects a wrong token", () => {
    const secret = service.generateSecret();
    expect(service.verify("000000", secret)).toBe(false);
  });

  it("builds a provisioning key URI", () => {
    const secret = service.generateSecret();
    const uri = service.keyUri("admin@dc.io", "dateChain", secret);
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("dateChain");
  });
});
