import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import Redis from "ioredis";
import request from "supertest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { DataSource } from "typeorm";

import { buildDataSourceOptions } from "../src/database/typeorm.config";

const PHONE = "+15550009999";

describe("Auth (e2e)", () => {
  let pg: StartedPostgreSqlContainer;
  let redisContainer: StartedTestContainer;
  let redis: Redis;
  let app: INestApplication;

  beforeAll(async () => {
    pg = await new PostgreSqlContainer("postgis/postgis:16-3.4")
      .withDatabase("datechain")
      .withUsername("datechain")
      .withPassword("datechain")
      .start();
    redisContainer = await new GenericContainer("redis:7-alpine").withExposedPorts(6379).start();

    process.env.POSTGRES_HOST = pg.getHost();
    process.env.POSTGRES_PORT = String(pg.getPort());
    process.env.POSTGRES_USER = pg.getUsername();
    process.env.POSTGRES_PASSWORD = pg.getPassword();
    process.env.POSTGRES_DB = pg.getDatabase();
    process.env.REDIS_HOST = redisContainer.getHost();
    process.env.REDIS_PORT = String(redisContainer.getMappedPort(6379));
    process.env.JWT_ACCESS_SECRET = "e2e-access-secret";
    process.env.JWT_REFRESH_SECRET = "e2e-refresh-secret";

    const ds = new DataSource(
      buildDataSourceOptions({
        POSTGRES_HOST: process.env.POSTGRES_HOST,
        POSTGRES_PORT: Number(process.env.POSTGRES_PORT),
        POSTGRES_USER: process.env.POSTGRES_USER,
        POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
        POSTGRES_DB: process.env.POSTGRES_DB,
      }),
    );
    await ds.initialize();
    await ds.runMigrations();
    await ds.destroy();

    redis = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
    });

    const { AppModule } = await import("../src/app.module");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 240000);

  afterAll(async () => {
    await app?.close();
    redis?.disconnect();
    await pg?.stop();
    await redisContainer?.stop();
  });

  async function login(): Promise<{ accessToken: string; refreshToken: string }> {
    await request(app.getHttpServer())
      .post("/auth/otp/request")
      .send({ channel: "phone", identifier: PHONE })
      .expect(200);
    const code = await redis.get(`otp:phone:${PHONE}`);
    const res = await request(app.getHttpServer())
      .post("/auth/otp/verify")
      .send({ channel: "phone", identifier: PHONE, code })
      .expect(200);
    return res.body.tokens;
  }

  it("issues a valid token pair via OTP and returns the user from /auth/me", async () => {
    const tokens = await login();
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toMatch(/^[a-f0-9]{64}$/);

    const me = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .expect(200);
    expect(me.body.role).toBe("USER");
    expect(me.body.userId).toBeDefined();
  });

  it("rotates the refresh token and rejects reuse of the old one", async () => {
    const tokens = await login();

    const rotated = await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: tokens.refreshToken })
      .expect(200);
    expect(rotated.body.refreshToken).not.toBe(tokens.refreshToken);

    // Reusing the original (now revoked) refresh token must be rejected.
    await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: tokens.refreshToken })
      .expect(401);
  });

  it("rejects a protected route without a token (401)", async () => {
    await request(app.getHttpServer()).get("/auth/me").expect(401);
  });

  it("rejects an admin route for a regular user (403)", async () => {
    const tokens = await login();
    await request(app.getHttpServer())
      .get("/auth/admin/ping")
      .set("Authorization", `Bearer ${tokens.accessToken}`)
      .expect(403);
  });
});
