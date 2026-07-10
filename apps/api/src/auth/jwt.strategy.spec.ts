import { UserRole } from "@datechain/types";
import { ConfigService } from "@nestjs/config";

import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy", () => {
  const config = { getOrThrow: jest.fn().mockReturnValue("secret") } as unknown as ConfigService;
  const strategy = new JwtStrategy(config);

  it("maps the JWT payload to an authenticated user", () => {
    expect(strategy.validate({ sub: "u1", role: UserRole.Admin })).toEqual({
      userId: "u1",
      role: UserRole.Admin,
    });
  });
});
