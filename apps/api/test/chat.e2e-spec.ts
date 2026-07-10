import type { AddressInfo } from "node:net";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import Redis from "ioredis";
import { io, type Socket } from "socket.io-client";
import request from "supertest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { DataSource } from "typeorm";

import { buildDataSourceOptions } from "../src/database/typeorm.config";

interface TestUser {
  userId: string;
  token: string;
}

function once<T = unknown>(socket: Socket, event: string, timeout = 4000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeout);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function emitAck<T = unknown>(socket: Socket, event: string, payload: unknown): Promise<T> {
  return new Promise<T>((resolve) => socket.emit(event, payload, resolve));
}

describe("Chat realtime (e2e)", () => {
  let pg: StartedPostgreSqlContainer;
  let redisContainer: StartedTestContainer;
  let redis: Redis;
  let app: INestApplication;
  let url: string;
  let seq = 300;
  const sockets: Socket[] = [];

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
    redis.on("error", () => undefined);

    const { AppModule } = await import("../src/app.module");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.listen(0);
    const port = (app.getHttpServer().address() as AddressInfo).port;
    url = `http://127.0.0.1:${port}`;
  }, 240000);

  afterAll(async () => {
    for (const s of sockets) s.disconnect();
    await app?.close();
    redis?.disconnect();
    await pg?.stop();
    await redisContainer?.stop();
  });

  async function newUser(): Promise<TestUser> {
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

  async function matchPair(): Promise<{ a: TestUser; b: TestUser; matchId: string }> {
    const a = await newUser();
    const b = await newUser();
    await request(app.getHttpServer())
      .post("/swipes")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ targetId: b.userId, action: "LIKE" })
      .expect(201);
    const res = await request(app.getHttpServer())
      .post("/swipes")
      .set("Authorization", `Bearer ${b.token}`)
      .send({ targetId: a.userId, action: "LIKE" })
      .expect(201);
    return { a, b, matchId: res.body.matchId };
  }

  function connect(token: string): Promise<Socket> {
    const socket = io(url, { auth: { token }, transports: ["websocket"], reconnection: false });
    sockets.push(socket);
    return new Promise((resolve, reject) => {
      socket.on("connect", () => resolve(socket));
      socket.on("connect_error", reject);
    });
  }

  it("delivers a message in real time between two matched users", async () => {
    const { a, b, matchId } = await matchPair();
    const sa = await connect(a.token);
    const sb = await connect(b.token);
    expect(await emitAck(sa, "match:join", { matchId })).toMatchObject({ ok: true });
    expect(await emitAck(sb, "match:join", { matchId })).toMatchObject({ ok: true });

    const received = once<{ text: string; senderId: string }>(sa, "message:new");
    await emitAck(sb, "message:send", { matchId, text: "Привет!" });
    const msg = await received;
    expect(msg.text).toBe("Привет!");
    expect(msg.senderId).toBe(b.userId);
  });

  it("relays typing indicators to the other participant", async () => {
    const { a, b, matchId } = await matchPair();
    const sa = await connect(a.token);
    const sb = await connect(b.token);
    await emitAck(sa, "match:join", { matchId });
    await emitAck(sb, "match:join", { matchId });

    const typing = once<{ userId: string; isTyping: boolean }>(sa, "typing");
    await emitAck(sb, "typing", { matchId, isTyping: true });
    const evt = await typing;
    expect(evt).toMatchObject({ userId: b.userId, isTyping: true });
  });

  it("tracks presence and clears it on disconnect", async () => {
    const { a, b } = await matchPair();
    const sa = await connect(a.token);
    const sb = await connect(b.token);

    const before = await emitAck<Record<string, boolean>>(sa, "presence:check", {
      userIds: [b.userId],
    });
    expect(before[b.userId]).toBe(true);

    sb.disconnect();
    await new Promise((r) => setTimeout(r, 300));
    const after = await emitAck<Record<string, boolean>>(sa, "presence:check", {
      userIds: [b.userId],
    });
    expect(after[b.userId]).toBe(false);
  });

  it("rejects an unauthenticated socket", async () => {
    const socket = io(url, {
      auth: { token: "garbage" },
      transports: ["websocket"],
      reconnection: false,
    });
    sockets.push(socket);
    const disconnected = await new Promise<boolean>((resolve) => {
      socket.on("connect", () => socket.once("disconnect", () => resolve(true)));
      socket.on("connect_error", () => resolve(true));
      setTimeout(() => resolve(false), 4000);
    });
    expect(disconnected).toBe(true);
  });

  it("forbids joining a match room you are not part of", async () => {
    const { matchId } = await matchPair();
    const intruder = await newUser();
    const si = await connect(intruder.token);
    const ack = await emitAck<{ ok: boolean; error?: string }>(si, "match:join", { matchId });
    expect(ack.ok).toBe(false);
    expect(ack.error).toBe("forbidden");
  });

  it("paginates history and marks messages read (REST)", async () => {
    const { a, b, matchId } = await matchPair();
    for (const text of ["m1", "m2", "m3"]) {
      await request(app.getHttpServer())
        .post(`/matches/${matchId}/messages`)
        .set("Authorization", `Bearer ${a.token}`)
        .send({ text })
        .expect(201);
    }

    const page = await request(app.getHttpServer())
      .get(`/matches/${matchId}/messages?limit=2`)
      .set("Authorization", `Bearer ${b.token}`)
      .expect(200);
    expect(page.body).toHaveLength(2);

    const read = await request(app.getHttpServer())
      .post(`/matches/${matchId}/messages/read`)
      .set("Authorization", `Bearer ${b.token}`)
      .expect(201);
    expect(read.body.updated).toBe(3);
  });
});
