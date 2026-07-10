import { validateEnv } from "./env.validation";

const validEnv = {
  NODE_ENV: "test",
  API_PORT: "3000",
  POSTGRES_HOST: "localhost",
  POSTGRES_PORT: "5432",
  POSTGRES_USER: "datechain",
  POSTGRES_PASSWORD: "datechain",
  POSTGRES_DB: "datechain",
  REDIS_HOST: "localhost",
  REDIS_PORT: "6379",
};

describe("validateEnv", () => {
  it("coerces and returns a valid environment", () => {
    const env = validateEnv(validEnv);
    expect(env.POSTGRES_PORT).toBe(5432);
    expect(env.REDIS_PORT).toBe(6379);
    expect(env.API_PORT).toBe(3000);
  });

  it("throws when a required variable is missing", () => {
    const { POSTGRES_HOST: _omit, ...rest } = validEnv;
    expect(() => validateEnv(rest)).toThrow(/Invalid environment configuration/);
  });

  it("throws when a port is not numeric", () => {
    expect(() => validateEnv({ ...validEnv, REDIS_PORT: "not-a-number" })).toThrow();
  });
});
