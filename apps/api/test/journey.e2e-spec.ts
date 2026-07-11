import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import Redis from "ioredis";
import request from "supertest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { DataSource } from "typeorm";

import { buildDataSourceOptions } from "../src/database/typeorm.config";

/**
 * End-to-end user journey exercising the whole backend in one flow:
 * register -> profile -> mutual swipe -> match -> message -> report ->
 * moderator resolves with ban.
 */
describe("Full journey (e2e)", () => {
  let pg: StartedPostgreSqlContainer;
  let redisContainer: StartedTestContainer;
  let redis: Redis;
  let ds: DataSource;
  let app: INestApplication;
  let seq = 500;

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

  const http = () => request(app.getHttpServer());

  async function register(gender: string, interestedIn: string[]) {
    const phone = `+1555${String(seq++).padStart(7, "0")}`;
    await http()
      .post("/auth/otp/request")
      .send({ channel: "phone", identifier: phone })
      .expect(200);
    const code = await redis.get(`otp:phone:${phone}`);
    const res = await http()
      .post("/auth/otp/verify")
      .send({ channel: "phone", identifier: phone, code })
      .expect(200);
    const token = res.body.tokens.accessToken as string;
    await http()
      .put("/profile/me")
      .set("Authorization", `Bearer ${token}`)
      .send({
        displayName: "User",
        birthDate: "1996-01-01",
        gender,
        interestedIn,
        lat: 55.7558,
        lng: 37.6173,
      })
      .expect(200);
    return { userId: res.body.user.id as string, token, phone };
  }

  it("runs register -> match -> message -> report -> moderate+ban", async () => {
    const alex = await register("MAN", ["WOMAN"]);
    const kate = await register("WOMAN", ["MAN"]);

    // Mutual like -> match
    await http()
      .post("/swipes")
      .set("Authorization", `Bearer ${alex.token}`)
      .send({ targetId: kate.userId, action: "LIKE" })
      .expect(201);
    const matchRes = await http()
      .post("/swipes")
      .set("Authorization", `Bearer ${kate.token}`)
      .send({ targetId: alex.userId, action: "LIKE" })
      .expect(201);
    expect(matchRes.body.matched).toBe(true);
    const matchId = matchRes.body.matchId as string;

    // Message
    await http()
      .post(`/matches/${matchId}/messages`)
      .set("Authorization", `Bearer ${alex.token}`)
      .send({ text: "Привет!" })
      .expect(201);
    const thread = await http()
      .get(`/matches/${matchId}/messages`)
      .set("Authorization", `Bearer ${kate.token}`)
      .expect(200);
    expect(thread.body).toHaveLength(1);

    // Report
    await http()
      .post("/reports")
      .set("Authorization", `Bearer ${kate.token}`)
      .send({ reportedId: alex.userId, category: "ABUSE", reason: "rude" })
      .expect(201);

    // Elevate a moderator and resolve the report with a ban
    const modPhone = `+1555${String(seq++).padStart(7, "0")}`;
    await http()
      .post("/auth/otp/request")
      .send({ channel: "phone", identifier: modPhone })
      .expect(200);
    const modCode = await redis.get(`otp:phone:${modPhone}`);
    const modVerify = await http()
      .post("/auth/otp/verify")
      .send({ channel: "phone", identifier: modPhone, code: modCode })
      .expect(200);
    await ds.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [modVerify.body.user.id]);
    const modLogin = await http()
      .post("/auth/otp/request")
      .send({ channel: "phone", identifier: modPhone })
      .expect(200);
    void modLogin;
    const modCode2 = await redis.get(`otp:phone:${modPhone}`);
    const modAuth = await http()
      .post("/auth/otp/verify")
      .send({ channel: "phone", identifier: modPhone, code: modCode2 })
      .expect(200);
    const modToken = modAuth.body.tokens.accessToken as string;

    const queue = await http()
      .get("/admin/reports")
      .set("Authorization", `Bearer ${modToken}`)
      .expect(200);
    const report = queue.body.find((r: { reportedId: string }) => r.reportedId === alex.userId);
    expect(report).toBeDefined();

    await http()
      .post(`/admin/reports/${report.id}/resolve`)
      .set("Authorization", `Bearer ${modToken}`)
      .send({ status: "RESOLVED", ban: true })
      .expect(201);

    const banned = await http()
      .get(`/admin/users/${alex.userId}`)
      .set("Authorization", `Bearer ${modToken}`)
      .expect(200);
    expect(banned.body.status).toBe("BANNED");
  });
});
