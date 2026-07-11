import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import request from "supertest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";

describe("Rate limiting (e2e)", () => {
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
    process.env.JWT_ACCESS_SECRET = "e2e-access";
    process.env.JWT_REFRESH_SECRET = "e2e-refresh";
    process.env.THROTTLE_LIMIT = "3";
    process.env.THROTTLE_TTL_SECONDS = "60";

    const { AppModule } = await import("../src/app.module");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  }, 180000);

  afterAll(async () => {
    await app?.close();
    await pg?.stop();
    await redis?.stop();
    // Prevent the low limit leaking into other suites (shared process.env).
    delete process.env.THROTTLE_LIMIT;
    delete process.env.THROTTLE_TTL_SECONDS;
  });

  it("returns 429 once the request limit is exceeded", async () => {
    const server = app.getHttpServer();
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await request(server).get("/health");
      statuses.push(res.status);
    }
    // With a limit of 3, the 4th and 5th requests are throttled.
    expect(statuses.filter((s) => s === 200).length).toBeLessThanOrEqual(3);
    expect(statuses).toContain(429);
  });
});
