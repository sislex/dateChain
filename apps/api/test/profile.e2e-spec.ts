import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import Redis from "ioredis";
import sharp from "sharp";
import request from "supertest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { DataSource } from "typeorm";

import { buildDataSourceOptions } from "../src/database/typeorm.config";

describe("Profile & Media (e2e)", () => {
  let pg: StartedPostgreSqlContainer;
  let redisContainer: StartedTestContainer;
  let redis: Redis;
  let app: INestApplication;
  let mediaDir: string;

  beforeAll(async () => {
    pg = await new PostgreSqlContainer("postgis/postgis:16-3.4")
      .withDatabase("datechain")
      .withUsername("datechain")
      .withPassword("datechain")
      .start();
    redisContainer = await new GenericContainer("redis:7-alpine").withExposedPorts(6379).start();
    mediaDir = mkdtempSync(join(tmpdir(), "dc-media-"));

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
    await pg?.stop();
    await redisContainer?.stop();
    if (mediaDir) rmSync(mediaDir, { recursive: true, force: true });
  });

  async function login(phone: string): Promise<string> {
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

  const validProfile = {
    displayName: "Alex",
    birthDate: "1996-04-12",
    gender: "MAN",
    interestedIn: ["WOMAN"],
    bio: "Coffee and mountains",
    interests: ["coffee", "hiking"],
    lat: 55.75,
    lng: 37.61,
  };

  async function pngBuffer(): Promise<Buffer> {
    return sharp({
      create: { width: 20, height: 24, channels: 3, background: { r: 200, g: 40, b: 90 } },
    })
      .png()
      .toBuffer();
  }

  it("rejects a profile for an under-18 user (400)", async () => {
    const token = await login("+15550000001");
    await request(app.getHttpServer())
      .put("/profile/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validProfile, birthDate: "2020-01-01" })
      .expect(400);
  });

  it("rejects invalid profile payloads (400)", async () => {
    const token = await login("+15550000002");
    await request(app.getHttpServer())
      .put("/profile/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validProfile, gender: "ROBOT" })
      .expect(400);
  });

  it("creates a valid profile and reports completion", async () => {
    const token = await login("+15550000003");
    const res = await request(app.getHttpServer())
      .put("/profile/me")
      .set("Authorization", `Bearer ${token}`)
      .send(validProfile)
      .expect(200);
    expect(res.body.age).toBeGreaterThanOrEqual(18);
    expect(res.body.completion).toBeGreaterThan(0);
  });

  it("uploads a photo (original + thumbnail + blurhash) and serves it to the owner", async () => {
    const token = await login("+15550000004");
    await request(app.getHttpServer())
      .put("/profile/me")
      .set("Authorization", `Bearer ${token}`)
      .send(validProfile)
      .expect(200);

    const upload = await request(app.getHttpServer())
      .post("/profile/me/photos")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", await pngBuffer(), "photo.png")
      .expect(201);
    expect(upload.body.blurhash).toBeTruthy();
    expect(upload.body.isMain).toBe(true);
    const photoId = upload.body.id;

    await request(app.getHttpServer())
      .get(`/media/photo/${photoId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect("Content-Type", /image\/jpeg/);

    await request(app.getHttpServer())
      .get(`/media/photo/${photoId}/thumb`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    // A different user must not access the photo.
    const otherToken = await login("+15550000005");
    await request(app.getHttpServer())
      .get(`/media/photo/${photoId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(403);
  });

  it("reorders and deletes photos", async () => {
    const token = await login("+15550000006");
    await request(app.getHttpServer())
      .put("/profile/me")
      .set("Authorization", `Bearer ${token}`)
      .send(validProfile)
      .expect(200);

    const a = (
      await request(app.getHttpServer())
        .post("/profile/me/photos")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", await pngBuffer(), "a.png")
        .expect(201)
    ).body;
    const b = (
      await request(app.getHttpServer())
        .post("/profile/me/photos")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", await pngBuffer(), "b.png")
        .expect(201)
    ).body;

    const reordered = await request(app.getHttpServer())
      .patch("/profile/me/photos/reorder")
      .set("Authorization", `Bearer ${token}`)
      .send({ order: [b.id, a.id] })
      .expect(200);
    expect(reordered.body[0].id).toBe(b.id);
    expect(reordered.body[0].isMain).toBe(true);

    await request(app.getHttpServer())
      .delete(`/profile/me/photos/${a.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const list = await request(app.getHttpServer())
      .get("/profile/me/photos")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(b.id);
  });
});
