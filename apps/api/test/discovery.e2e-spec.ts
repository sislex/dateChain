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
  token: string;
}

describe("Discovery (e2e)", () => {
  let pg: StartedPostgreSqlContainer;
  let redisContainer: StartedTestContainer;
  let redis: Redis;
  let ds: DataSource;
  let app: INestApplication;
  let phoneSeq = 100;

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

  async function createUser(profile: Record<string, unknown>): Promise<TestUser> {
    const phone = `+1555${String(phoneSeq++).padStart(7, "0")}`;
    await request(app.getHttpServer())
      .post("/auth/otp/request")
      .send({ channel: "phone", identifier: phone })
      .expect(200);
    const code = await redis.get(`otp:phone:${phone}`);
    const verify = await request(app.getHttpServer())
      .post("/auth/otp/verify")
      .send({ channel: "phone", identifier: phone, code })
      .expect(200);
    const token = verify.body.tokens.accessToken;
    await request(app.getHttpServer())
      .put("/profile/me")
      .set("Authorization", `Bearer ${token}`)
      .send(profile)
      .expect(200);
    return { userId: verify.body.user.id, token };
  }

  const MOSCOW = { lat: 55.7558, lng: 37.6173 };
  const NEAR = { lat: 55.76, lng: 37.62 }; // ~1 km
  const FAR = { lat: 59.9375, lng: 30.3086 }; // St. Petersburg, ~600 km

  it("returns nearby mutually-interested candidates and excludes others", async () => {
    const viewer = await createUser({
      displayName: "Viewer",
      birthDate: "1996-01-01",
      gender: "MAN",
      interestedIn: ["WOMAN"],
      ...MOSCOW,
      radiusKm: 80,
    });
    const nearWoman = await createUser({
      displayName: "NearWoman",
      birthDate: "1997-01-01",
      gender: "WOMAN",
      interestedIn: ["MAN"],
      ...NEAR,
    });
    await createUser({
      displayName: "FarWoman",
      birthDate: "1997-01-01",
      gender: "WOMAN",
      interestedIn: ["MAN"],
      ...FAR,
    });
    await createUser({
      displayName: "NearMan",
      birthDate: "1997-01-01",
      gender: "MAN",
      interestedIn: ["WOMAN"],
      ...NEAR,
    });

    const res = await request(app.getHttpServer())
      .get("/discovery/deck")
      .set("Authorization", `Bearer ${viewer.token}`)
      .expect(200);

    const ids = res.body.map((c: { userId: string }) => c.userId);
    expect(ids).toContain(nearWoman.userId);
    expect(res.body.every((c: { displayName: string }) => c.displayName !== "FarWoman")).toBe(true);
    expect(res.body.every((c: { displayName: string }) => c.displayName !== "NearMan")).toBe(true);
    const near = res.body.find((c: { userId: string }) => c.userId === nearWoman.userId);
    expect(near.distanceKm).toBeLessThan(80);
  });

  it("excludes already-swiped and blocked users", async () => {
    const viewer = await createUser({
      displayName: "V2",
      birthDate: "1996-01-01",
      gender: "MAN",
      interestedIn: ["WOMAN"],
      ...MOSCOW,
    });
    const swiped = await createUser({
      displayName: "Swiped",
      birthDate: "1997-01-01",
      gender: "WOMAN",
      interestedIn: ["MAN"],
      ...NEAR,
    });
    const blocked = await createUser({
      displayName: "Blocked",
      birthDate: "1997-01-01",
      gender: "WOMAN",
      interestedIn: ["MAN"],
      ...NEAR,
    });

    await ds.query(`INSERT INTO swipes ("actorId","targetId","action") VALUES ($1,$2,'LIKE')`, [
      viewer.userId,
      swiped.userId,
    ]);
    await ds.query(`INSERT INTO blocks ("blockerId","blockedId") VALUES ($1,$2)`, [
      viewer.userId,
      blocked.userId,
    ]);

    const res = await request(app.getHttpServer())
      .get("/discovery/deck")
      .set("Authorization", `Bearer ${viewer.token}`)
      .expect(200);
    const ids = res.body.map((c: { userId: string }) => c.userId);
    expect(ids).not.toContain(swiped.userId);
    expect(ids).not.toContain(blocked.userId);
  });

  it("uses the GiST location index for the radius filter", async () => {
    // With seq scans disabled the planner must use the spatial index if usable.
    await ds.query(`SET enable_seqscan = off`);
    const plan = await ds.query(
      `EXPLAIN SELECT "userId" FROM profiles
       WHERE location IS NOT NULL
         AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, 80000)`,
      [MOSCOW.lng, MOSCOW.lat],
    );
    await ds.query(`SET enable_seqscan = on`);
    const text = plan.map((r: Record<string, string>) => r["QUERY PLAN"]).join("\n");
    expect(text).toContain("idx_profiles_location");
  });
});
