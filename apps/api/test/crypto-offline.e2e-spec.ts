import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import Redis from "ioredis";
import request from "supertest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { DataSource } from "typeorm";

import { buildDataSourceOptions } from "../src/database/typeorm.config";

/**
 * Crypto resilience: with no deployed contracts (deployments file missing) the
 * API must still boot and serve the core product, while crypto endpoints fail
 * gracefully with 503 instead of crashing with 500s.
 */
describe("Crypto endpoints without a blockchain (e2e)", () => {
  let pg: StartedPostgreSqlContainer;
  let redisContainer: StartedTestContainer;
  let redis: Redis;
  let ds: DataSource;
  let app: INestApplication;
  let token: string;

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
    // Point at a file that does not exist — the chain is "not deployed".
    process.env.CONTRACTS_DEPLOYMENTS = "/nonexistent/deployments.json";

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

    // Register a user through the normal OTP flow.
    const phone = "+15559990001";
    await request(app.getHttpServer())
      .post("/auth/otp/request")
      .send({ channel: "phone", identifier: phone })
      .expect(200);
    const code = await redis.get(`otp:phone:${phone}`);
    const res = await request(app.getHttpServer())
      .post("/auth/otp/verify")
      .send({ channel: "phone", identifier: phone, code })
      .expect(200);
    token = res.body.tokens.accessToken as string;
  }, 240000);

  afterAll(async () => {
    await app?.close();
    redis?.disconnect();
    await ds?.destroy();
    await pg?.stop();
    await redisContainer?.stop();
  });

  const http = () => request(app.getHttpServer());
  const auth = (r: request.Test) => r.set("Authorization", `Bearer ${token}`);

  it("still serves health and auth", async () => {
    const res = await http().get("/health").expect(200);
    expect(res.body.status).toBe("ok");
  });

  it("wallet endpoints respond 503 instead of crashing", async () => {
    await auth(http().get("/wallet")).expect(503);
    await auth(http().get("/wallet/history")).expect(503);
    await auth(http().post("/wallet/topup").send({ amount: 100 })).expect(503);
  });

  it("fee endpoints respond 503", async () => {
    await auth(http().get("/dates/fee")).expect(503);
    await auth(http().get("/transfers/fee")).expect(503);
  });

  it("date and transfer listings still work (empty), money actions fail gracefully", async () => {
    const dates = await auth(http().get("/dates")).expect(200);
    expect(dates.body).toEqual([]);
    const transfers = await auth(http().get("/transfers")).expect(200);
    expect(transfers.body).toEqual([]);

    await auth(
      http().post("/dates").send({ inviteeId: "00000000-0000-4000-8000-000000000001", amount: 10 }),
    ).expect(503);
    await auth(
      http()
        .post("/transfers")
        .send({ toUserId: "00000000-0000-4000-8000-000000000001", amount: 10 }),
    ).expect(503);
  });
});
