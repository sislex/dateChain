import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import request from "supertest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { DataSource } from "typeorm";

import { buildDataSourceOptions } from "../src/database/typeorm.config";

describe("Infrastructure (e2e)", () => {
  let pg: StartedPostgreSqlContainer;
  let redis: StartedTestContainer;
  let app: INestApplication;

  beforeAll(async () => {
    pg = await new PostgreSqlContainer("postgis/postgis:16-3.4")
      .withDatabase("datechain")
      .withUsername("datechain")
      .withPassword("datechain")
      .start();

    redis = await new GenericContainer("redis:7-alpine").withExposedPorts(6379).start();

    process.env.POSTGRES_HOST = pg.getHost();
    process.env.POSTGRES_PORT = String(pg.getPort());
    process.env.POSTGRES_USER = pg.getUsername();
    process.env.POSTGRES_PASSWORD = pg.getPassword();
    process.env.POSTGRES_DB = pg.getDatabase();
    process.env.REDIS_HOST = redis.getHost();
    process.env.REDIS_PORT = String(redis.getMappedPort(6379));
    process.env.JWT_ACCESS_SECRET = "test-access-secret";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  }, 180000);

  afterAll(async () => {
    await app?.close();
    await pg?.stop();
    await redis?.stop();
  });

  it("applies and reverts migrations", async () => {
    const ds = new DataSource(
      buildDataSourceOptions({
        POSTGRES_HOST: process.env.POSTGRES_HOST!,
        POSTGRES_PORT: Number(process.env.POSTGRES_PORT),
        POSTGRES_USER: process.env.POSTGRES_USER!,
        POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD!,
        POSTGRES_DB: process.env.POSTGRES_DB!,
      }),
    );
    await ds.initialize();

    // Generic up/down check via the migrations ledger — robust to how many
    // migrations exist. `_schema_baseline` (from the first migration) confirms up.
    await ds.runMigrations();
    const applied = await ds.query(`SELECT count(*)::int AS n FROM "_migrations"`);
    expect(applied[0].n).toBeGreaterThan(0);
    const baseline = await ds.query(`SELECT to_regclass('public._schema_baseline') AS t`);
    expect(baseline[0].t).toBe("_schema_baseline");

    await ds.undoLastMigration();
    const afterDown = await ds.query(`SELECT count(*)::int AS n FROM "_migrations"`);
    expect(afterDown[0].n).toBe(applied[0].n - 1);

    // Re-apply so the schema is complete again.
    await ds.runMigrations();

    await ds.destroy();
  });

  it("GET /health returns 200 with db and redis up", async () => {
    // Imported dynamically so ConfigModule.forRoot validates against the env
    // set from the containers above (it runs eagerly at module import time).
    const { AppModule } = await import("../src/app.module");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const res = await request(app.getHttpServer()).get("/health").expect(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.info.database.status).toBe("up");
    expect(res.body.info.redis.status).toBe("up");
  });
});
