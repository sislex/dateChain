import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import Redis from "ioredis";
import request from "supertest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { DataSource } from "typeorm";

import { buildDataSourceOptions } from "../src/database/typeorm.config";

describe("Matching (e2e)", () => {
  let pg: StartedPostgreSqlContainer;
  let redisContainer: StartedTestContainer;
  let redis: Redis;
  let app: INestApplication;
  let seq = 200;

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
    process.env.JWT_ACCESS_SECRET = "e2e-access";
    process.env.JWT_REFRESH_SECRET = "e2e-refresh";

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

    redis = new Redis({ host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) });

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

  async function newUser(): Promise<{ userId: string; token: string }> {
    const phone = `+1555${String(seq++).padStart(7, "0")}`;
    await request(app.getHttpServer())
      .post("/auth/otp/request")
      .send({ channel: "phone", identifier: phone })
      .expect(200);
    const code = await redis.get(`otp:phone:${phone}`);
    const res = await request(app.getHttpServer())
      .post("/auth/otp/verify")
      .send({ channel: "phone", identifier: phone, code })
      .expect(200);
    return { userId: res.body.user.id, token: res.body.tokens.accessToken };
  }

  const swipe = (token: string, targetId: string, action: string) =>
    request(app.getHttpServer())
      .post("/swipes")
      .set("Authorization", `Bearer ${token}`)
      .send({ targetId, action });

  it("creates a match only on a reciprocal like", async () => {
    const a = await newUser();
    const b = await newUser();

    const first = await swipe(a.token, b.userId, "LIKE").expect(201);
    expect(first.body.matched).toBe(false);

    const second = await swipe(b.token, a.userId, "LIKE").expect(201);
    expect(second.body.matched).toBe(true);
    expect(second.body.matchId).toBeDefined();

    for (const u of [a, b]) {
      const matches = await request(app.getHttpServer())
        .get("/matches")
        .set("Authorization", `Bearer ${u.token}`)
        .expect(200);
      expect(matches.body).toHaveLength(1);
      expect(matches.body[0].id).toBe(second.body.matchId);
    }
  });

  it("rejects a self-swipe (400)", async () => {
    const a = await newUser();
    await swipe(a.token, a.userId, "LIKE").expect(400);
  });

  it("rewind is disabled by default (403)", async () => {
    const a = await newUser();
    await request(app.getHttpServer())
      .post("/swipes/rewind")
      .set("Authorization", `Bearer ${a.token}`)
      .expect(403);
  });

  it("unmatch removes the match for both participants", async () => {
    const a = await newUser();
    const b = await newUser();
    await swipe(a.token, b.userId, "LIKE").expect(201);
    const match = (await swipe(b.token, a.userId, "SUPER_LIKE").expect(201)).body;

    await request(app.getHttpServer())
      .delete(`/matches/${match.matchId}`)
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);

    for (const u of [a, b]) {
      const matches = await request(app.getHttpServer())
        .get("/matches")
        .set("Authorization", `Bearer ${u.token}`)
        .expect(200);
      expect(matches.body).toHaveLength(0);
    }
  });
});
