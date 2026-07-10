import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import Redis from "ioredis";
import request from "supertest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { DataSource } from "typeorm";

import { buildDataSourceOptions } from "../src/database/typeorm.config";

interface TestUser {
  userId: string;
  phone: string;
  token: string;
}

describe("Moderation & Admin (e2e)", () => {
  let pg: StartedPostgreSqlContainer;
  let redisContainer: StartedTestContainer;
  let redis: Redis;
  let ds: DataSource;
  let app: INestApplication;
  let seq = 400;

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

    ds = new DataSource(
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

    redis = new Redis({ host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) });
    redis.on("error", () => undefined);

    const { AppModule } = await import("../src/app.module");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 240000);

  afterAll(async () => {
    await app?.close();
    redis?.disconnect();
    await ds?.destroy();
    await pg?.stop();
    await redisContainer?.stop();
  });

  async function loginFresh(phone: string): Promise<string> {
    await request(app.getHttpServer())
      .post("/auth/otp/request")
      .send({ channel: "phone", identifier: phone })
      .expect(200);
    const code = await redis.get(`otp:phone:${phone}`);
    const res = await request(app.getHttpServer())
      .post("/auth/otp/verify")
      .send({ channel: "phone", identifier: phone, code })
      .expect(200);
    return res.body.tokens.accessToken;
  }

  async function makeUser(role?: string): Promise<TestUser> {
    const phone = `+1555${String(seq++).padStart(7, "0")}`;
    let token = await loginFresh(phone);
    const me = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const userId = me.body.userId;
    if (role) {
      await ds.query(`UPDATE users SET role = $1 WHERE id = $2`, [role, userId]);
      token = await loginFresh(phone); // re-issue token carrying the new role
    }
    return { userId, phone, token };
  }

  it("a user report lands in the moderator queue with a priority", async () => {
    const reporter = await makeUser();
    const bad = await makeUser();
    await request(app.getHttpServer())
      .post("/reports")
      .set("Authorization", `Bearer ${reporter.token}`)
      .send({ reportedId: bad.userId, category: "ABUSE", reason: "spamming" })
      .expect(201);

    const moderator = await makeUser("MODERATOR");
    const queue = await request(app.getHttpServer())
      .get("/admin/reports")
      .set("Authorization", `Bearer ${moderator.token}`)
      .expect(200);
    const entry = queue.body.find((r: { reportedId: string }) => r.reportedId === bad.userId);
    expect(entry).toBeDefined();
    expect(entry.priority).toBeGreaterThanOrEqual(1);
  });

  it("blocking a match removes it from chat for the blocker", async () => {
    const a = await makeUser();
    const b = await makeUser();
    await request(app.getHttpServer())
      .post("/swipes")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ targetId: b.userId, action: "LIKE" })
      .expect(201);
    await request(app.getHttpServer())
      .post("/swipes")
      .set("Authorization", `Bearer ${b.token}`)
      .send({ targetId: a.userId, action: "LIKE" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/blocks")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ userId: b.userId })
      .expect(201);

    const matches = await request(app.getHttpServer())
      .get("/matches")
      .set("Authorization", `Bearer ${a.token}`)
      .expect(200);
    expect(matches.body).toHaveLength(0);
  });

  it("admin ban is recorded in the audit log", async () => {
    const admin = await makeUser("ADMIN");
    const victim = await makeUser();
    await request(app.getHttpServer())
      .post(`/admin/users/${victim.userId}/status`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "BANNED" })
      .expect(201);

    const audit = await request(app.getHttpServer())
      .get("/admin/audit")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);
    const entry = audit.body.find(
      (a: { action: string; targetId: string }) =>
        a.action === "user.status" && a.targetId === victim.userId,
    );
    expect(entry).toBeDefined();
  });

  it("metrics endpoint returns platform aggregates", async () => {
    const analyst = await makeUser("ANALYST");
    const res = await request(app.getHttpServer())
      .get("/admin/metrics")
      .set("Authorization", `Bearer ${analyst.token}`)
      .expect(200);
    expect(res.body.totalUsers).toBeGreaterThan(0);
    expect(res.body).toHaveProperty("openReports");
  });

  it("RBAC: a moderator cannot read the audit log or impersonate (403)", async () => {
    const moderator = await makeUser("MODERATOR");
    const target = await makeUser();
    await request(app.getHttpServer())
      .get("/admin/audit")
      .set("Authorization", `Bearer ${moderator.token}`)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/admin/users/${target.userId}/impersonate`)
      .set("Authorization", `Bearer ${moderator.token}`)
      .expect(403);
  });

  it("a super admin can impersonate a user", async () => {
    const superAdmin = await makeUser("SUPER_ADMIN");
    const target = await makeUser();
    const res = await request(app.getHttpServer())
      .post(`/admin/users/${target.userId}/impersonate`)
      .set("Authorization", `Bearer ${superAdmin.token}`)
      .expect(201);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.user.id).toBe(target.userId);
  });
});
