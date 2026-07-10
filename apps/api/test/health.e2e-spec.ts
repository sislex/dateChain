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

  it("applies and reverts the initial migration", async () => {
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

    await ds.runMigrations();
    // "photos" is created by the latest migration — use it as the canary.
    const afterUp = await ds.query(`SELECT to_regclass('public.photos') AS t`);
    expect(afterUp[0].t).toBe("photos");

    // Revert only the last migration and confirm its table is gone…
    await ds.undoLastMigration();
    const afterDown = await ds.query(`SELECT to_regclass('public.photos') AS t`);
    expect(afterDown[0].t).toBeNull();
    // …while an earlier migration's table remains applied.
    const users = await ds.query(`SELECT to_regclass('public.users') AS t`);
    expect(users[0].t).toBe("users");

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
