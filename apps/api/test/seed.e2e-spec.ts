import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import Redis from "ioredis";
import request from "supertest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { DataSource } from "typeorm";

import { buildDataSourceOptions } from "../src/database/typeorm.config";
import { seedDatabase } from "../src/scripts/seed";

describe("Seed & demo data (e2e)", () => {
  let pg: StartedPostgreSqlContainer;
  let redisContainer: StartedTestContainer;
  let redis: Redis;
  let ds: DataSource;
  let app: INestApplication;
  let mediaDir: string;

  beforeAll(async () => {
    pg = await new PostgreSqlContainer("postgis/postgis:16-3.4")
      .withDatabase("datechain")
      .withUsername("datechain")
      .withPassword("datechain")
      .start();
    redisContainer = await new GenericContainer("redis:7-alpine").withExposedPorts(6379).start();
    mediaDir = mkdtempSync(join(tmpdir(), "dc-seed-"));

    process.env.POSTGRES_HOST = pg.getHost();
    process.env.POSTGRES_PORT = String(pg.getPort());
    process.env.POSTGRES_USER = pg.getUsername();
    process.env.POSTGRES_PASSWORD = pg.getPassword();
    process.env.POSTGRES_DB = pg.getDatabase();
    process.env.REDIS_HOST = redisContainer.getHost();
    process.env.REDIS_PORT = String(redisContainer.getMappedPort(6379));
    process.env.JWT_ACCESS_SECRET = "e2e-access";
    process.env.JWT_REFRESH_SECRET = "e2e-refresh";
    process.env.MEDIA_STORAGE_DIR = mediaDir;

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
    if (mediaDir) rmSync(mediaDir, { recursive: true, force: true });
  });

  it("seeds demo profiles and yields a non-empty discovery deck", async () => {
    const count = await seedDatabase(ds, { count: 20, mediaDir, phonePrefix: "+16660" });
    expect(count).toBe(20);

    const total = await ds.query(`SELECT count(*)::int AS n FROM profiles`);
    expect(total[0].n).toBe(20);

    // Log in as the first seeded user (a MAN interested in WOMAN) and expect
    // the deck to surface the seeded women nearby.
    const phone = "+16660000000";
    await request(app.getHttpServer())
      .post("/auth/otp/request")
      .send({ channel: "phone", identifier: phone })
      .expect(200);
    const code = await redis.get(`otp:phone:${phone}`);
    const auth = await request(app.getHttpServer())
      .post("/auth/otp/verify")
      .send({ channel: "phone", identifier: phone, code })
      .expect(200);

    const deck = await request(app.getHttpServer())
      .get("/discovery/deck")
      .set("Authorization", `Bearer ${auth.body.tokens.accessToken}`)
      .expect(200);
    expect(deck.body.length).toBeGreaterThan(0);
    expect(deck.body[0].photos.length).toBeGreaterThan(0);
  });
});
