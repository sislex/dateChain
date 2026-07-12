import { config as loadEnv } from "dotenv";
import { DataSource } from "typeorm";

import { buildDataSourceOptions } from "../database/typeorm.config";

/**
 * End-to-end API scenarios that exercise exactly the endpoints the web UI calls.
 * Actions go through HTTP (like the frontend); results are asserted both via the
 * API responses and by reading the rows written to Postgres.
 *
 * Requires the API running (default :3000) with AUTH_DEV_LOGIN=true.
 * Run: pnpm --filter @datechain/api scenarios
 */

const API = process.env.TEST_API_URL ?? "http://localhost:3000";

// Dedicated scenario accounts (isolated from demo/test users).
const PHONE_A = "+79995550001"; // мужчина, ищет женщин
const PHONE_B = "+79995550002"; // женщина, ищет мужчин
const PHONE_C = "+79995550003"; // цель для дизлайка
const PHONE_D = "+79995550004"; // отправитель суперлайка
const PHONE_E = "+79995550005"; // получатель суперлайка
const PHONE_F = "+79995550006"; // proposer свидания
const PHONE_G = "+79995550007"; // invitee свидания

// ── tiny assertion harness ────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed++;
    // eslint-disable-next-line no-console
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failed++;
    failures.push(name);
    // eslint-disable-next-line no-console
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string): void {
  // eslint-disable-next-line no-console
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ── HTTP helper ───────────────────────────────────────────────────────────
interface ApiResponse<T> {
  status: number;
  body: T;
}

async function api<T = unknown>(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body: body as T };
}

interface AuthResult {
  user: { id: string; phone: string };
  tokens: { accessToken: string; refreshToken: string };
}

function userId(r: ApiResponse<AuthResult>): string {
  return r.body.user.id;
}

// ── main ──────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  loadEnv({ path: [".env", "../../.env"] });

  const ds = new DataSource(
    buildDataSourceOptions({
      POSTGRES_HOST: process.env.POSTGRES_HOST ?? "localhost",
      POSTGRES_PORT: Number(process.env.POSTGRES_PORT ?? 5432),
      POSTGRES_USER: process.env.POSTGRES_USER ?? "datechain",
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ?? "datechain",
      POSTGRES_DB: process.env.POSTGRES_DB ?? "datechain",
    }),
  );
  await ds.initialize();
  const db = <T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> =>
    ds.query(sql, params) as Promise<T[]>;

  // Login (dev, phone-only) — creates the accounts on first call.
  const a = await api<AuthResult>("POST", "/auth/otp/verify", {
    body: { channel: "phone", identifier: PHONE_A, code: "000000" },
  });
  const b = await api<AuthResult>("POST", "/auth/otp/verify", {
    body: { channel: "phone", identifier: PHONE_B, code: "000000" },
  });
  const c = await api<AuthResult>("POST", "/auth/otp/verify", {
    body: { channel: "phone", identifier: PHONE_C, code: "000000" },
  });
  const A = { id: userId(a), token: a.body.tokens.accessToken };
  const B = { id: userId(b), token: b.body.tokens.accessToken };
  const dd = await api<AuthResult>("POST", "/auth/otp/verify", {
    body: { channel: "phone", identifier: PHONE_D, code: "000000" },
  });
  const ee = await api<AuthResult>("POST", "/auth/otp/verify", {
    body: { channel: "phone", identifier: PHONE_E, code: "000000" },
  });
  const ff = await api<AuthResult>("POST", "/auth/otp/verify", {
    body: { channel: "phone", identifier: PHONE_F, code: "000000" },
  });
  const gg = await api<AuthResult>("POST", "/auth/otp/verify", {
    body: { channel: "phone", identifier: PHONE_G, code: "000000" },
  });
  const C = { id: userId(c), token: c.body.tokens.accessToken };
  const D = { id: userId(dd), token: dd.body.tokens.accessToken };
  const E = { id: userId(ee), token: ee.body.tokens.accessToken };
  const F = { id: userId(ff), token: ff.body.tokens.accessToken };
  const G = { id: userId(gg), token: gg.body.tokens.accessToken };
  const ids = [A.id, B.id, C.id, D.id, E.id, F.id, G.id];

  // Clean prior scenario data for deterministic re-runs.
  await db(`DELETE FROM ratings WHERE "raterId" = ANY($1) OR "rateeId" = ANY($1)`, [ids]);
  await db(`DELETE FROM dates WHERE "proposerId" = ANY($1) OR "inviteeId" = ANY($1)`, [ids]);
  await db(
    `DELETE FROM messages WHERE "matchId" IN (
       SELECT id FROM matches WHERE "userAId" = ANY($1) OR "userBId" = ANY($1))`,
    [ids],
  );
  await db(`DELETE FROM matches WHERE "userAId" = ANY($1) OR "userBId" = ANY($1)`, [ids]);
  await db(`DELETE FROM swipes WHERE "actorId" = ANY($1) OR "targetId" = ANY($1)`, [ids]);
  await db(`DELETE FROM notifications WHERE "userId" = ANY($1)`, [ids]);

  // ── Scenario 1: profile form data ────────────────────────────────────────
  section("Сценарий 1 — форма профиля (изменение данных)");
  const profileA = {
    displayName: "Сценарий A",
    birthDate: "1993-05-10",
    gender: "MAN",
    interestedIn: ["WOMAN"],
    bio: "Первичное био",
    interests: ["кофе", "бег"],
    lat: 55.7558,
    lng: 37.6173,
    radiusKm: 150,
    ageMin: 21,
    ageMax: 45,
    discoverable: false, // scenario accounts stay out of real users' decks
  };
  const putA = await api("PUT", "/profile/me", { token: A.token, body: profileA });
  check("PUT /profile/me (A) → 200", putA.status === 200, `status=${putA.status}`);
  await api("PUT", "/profile/me", {
    token: B.token,
    body: {
      displayName: "Сценарий B",
      birthDate: "1995-08-20",
      gender: "WOMAN",
      interestedIn: ["MAN"],
      bio: "Био B",
      lat: 55.75,
      lng: 37.61,
      radiusKm: 150,
      ageMin: 21,
      ageMax: 50,
      discoverable: false,
    },
  });
  await api("PUT", "/profile/me", {
    token: C.token,
    body: {
      displayName: "Сценарий C",
      birthDate: "1994-01-01",
      gender: "WOMAN",
      interestedIn: ["MAN"],
      lat: 55.75,
      lng: 37.61,
      discoverable: false,
    },
  });

  const meA = await api<{ displayName: string; bio: string; interests: string[] }>(
    "GET",
    "/profile/me",
    { token: A.token },
  );
  check("GET /profile/me (A) отражает сохранённые поля", meA.body.displayName === "Сценарий A");
  const [rowA] = await db<{ gender: string; interestedIn: string; location: string | null }>(
    `SELECT gender, "interestedIn", location FROM profiles WHERE "userId" = $1`,
    [A.id],
  );
  check("БД: профиль A записан (gender/interestedIn/location)", Boolean(rowA?.gender === "MAN" && rowA?.interestedIn.includes("WOMAN") && rowA?.location));

  // Change a form field and confirm the update persists.
  await api("PUT", "/profile/me", { token: A.token, body: { ...profileA, bio: "Обновлённое био" } });
  const meA2 = await api<{ bio: string }>("GET", "/profile/me", { token: A.token });
  check("Изменение поля формы (bio) сохраняется", meA2.body.bio === "Обновлённое био", `bio=${meA2.body.bio}`);

  // ── Scenario 2: dislike (NOPE) ───────────────────────────────────────────
  section("Сценарий 2 — дизлайк (свайп влево)");
  const nope = await api<{ matched: boolean }>("POST", "/swipes", {
    token: A.token,
    body: { targetId: C.id, action: "NOPE" },
  });
  check("POST /swipes NOPE → matched:false", nope.status === 201 && nope.body.matched === false);
  const [nopeRow] = await db<{ action: string }>(
    `SELECT action FROM swipes WHERE "actorId" = $1 AND "targetId" = $2`,
    [A.id, C.id],
  );
  check("БД: свайп записан с action=NOPE", nopeRow?.action === "NOPE", `action=${nopeRow?.action}`);

  // ── Scenario 3: one-sided like (no match) ────────────────────────────────
  section("Сценарий 3 — лайк без взаимности");
  const likeAB = await api<{ matched: boolean }>("POST", "/swipes", {
    token: A.token,
    body: { targetId: B.id, action: "LIKE" },
  });
  check("A лайкает B → matched:false (нет взаимности)", likeAB.body.matched === false);
  const [likeRow] = await db<{ action: string }>(
    `SELECT action FROM swipes WHERE "actorId" = $1 AND "targetId" = $2`,
    [A.id, B.id],
  );
  check("БД: лайк A→B записан (action=LIKE)", likeRow?.action === "LIKE");
  const matchesAearly = await api<unknown[]>("GET", "/matches", { token: A.token });
  check("GET /matches (A) пока пуст", Array.isArray(matchesAearly.body) && matchesAearly.body.length === 0);

  // ── Scenario 4: reciprocal like → match + notifications ──────────────────
  section("Сценарий 4 — взаимный лайк → мэтч + уведомления");
  const likeBA = await api<{ matched: boolean; matchId?: string }>("POST", "/swipes", {
    token: B.token,
    body: { targetId: A.id, action: "LIKE" },
  });
  check("B лайкает A → matched:true", likeBA.body.matched === true);
  const matchId = likeBA.body.matchId ?? "";
  check("Ответ содержит matchId", Boolean(matchId));

  const [matchRow] = await db<{ id: string }>(
    `SELECT id FROM matches WHERE ("userAId" = $1 AND "userBId" = $2) OR ("userAId" = $2 AND "userBId" = $1)`,
    [A.id, B.id],
  );
  check("БД: строка match создана", Boolean(matchRow?.id));

  const matchesA = await api<Array<{ id: string }>>("GET", "/matches", { token: A.token });
  const matchesB = await api<Array<{ id: string }>>("GET", "/matches", { token: B.token });
  check("GET /matches (A) содержит мэтч", matchesA.body.some((m) => m.id === matchId));
  check("GET /matches (B) содержит мэтч", matchesB.body.some((m) => m.id === matchId));

  // Notifications are created via events (async) — poll briefly.
  async function waitNotif(token: string, type: string): Promise<boolean> {
    for (let i = 0; i < 15; i++) {
      const n = await api<Array<{ type: string; payload: Record<string, unknown> }>>(
        "GET",
        "/notifications",
        { token },
      );
      if (Array.isArray(n.body) && n.body.some((x) => x.type === type)) return true;
      await sleep(200);
    }
    return false;
  }
  check("Уведомление MATCH пришло пользователю A", await waitNotif(A.token, "MATCH"));
  check("Уведомление MATCH пришло пользователю B", await waitNotif(B.token, "MATCH"));
  const [matchNotifCount] = await db<{ count: string }>(
    `SELECT count(*)::text AS count FROM notifications WHERE "userId" = ANY($1) AND type = 'MATCH'`,
    [[A.id, B.id]],
  );
  check("БД: два MATCH-уведомления (обоим)", matchNotifCount?.count === "2", `count=${matchNotifCount?.count}`);

  // ── Scenario 5: messaging (send / read / reply) ──────────────────────────
  section("Сценарий 5 — переписка (отправка, прочтение, ответ)");
  const send1 = await api<{ id: string; senderId: string }>(
    "POST",
    `/matches/${matchId}/messages`,
    { token: A.token, body: { text: "Привет, B!" } },
  );
  check("A отправляет сообщение → 201", send1.status === 201 && send1.body.senderId === A.id);

  const threadB = await api<Array<{ id: string; text: string; senderId: string; readAt: string | null }>>(
    "GET",
    `/matches/${matchId}/messages?limit=50`,
    { token: B.token },
  );
  check("B видит сообщение от A", threadB.body.some((m) => m.text === "Привет, B!" && m.senderId === A.id));
  check("Сообщение изначально непрочитано (readAt=null)", threadB.body[0]?.readAt === null);

  const previewsB = await api<Array<{ matchId: string; unreadCount: number }>>(
    "GET",
    "/matches/previews",
    { token: B.token },
  );
  const prev = previewsB.body.find((p) => p.matchId === matchId);
  check("GET /matches/previews (B): unreadCount ≥ 1", (prev?.unreadCount ?? 0) >= 1, `unread=${prev?.unreadCount}`);
  check("Уведомление MESSAGE пришло получателю B", await waitNotif(B.token, "MESSAGE"));

  const read = await api<{ updated: number }>("POST", `/matches/${matchId}/messages/read`, {
    token: B.token,
  });
  check("B помечает прочитанным → updated ≥ 1", (read.body.updated ?? 0) >= 1);
  const previewsB2 = await api<Array<{ matchId: string; unreadCount: number }>>(
    "GET",
    "/matches/previews",
    { token: B.token },
  );
  check(
    "После прочтения unreadCount = 0",
    (previewsB2.body.find((p) => p.matchId === matchId)?.unreadCount ?? -1) === 0,
  );

  const reply = await api<{ id: string; senderId: string }>(
    "POST",
    `/matches/${matchId}/messages`,
    { token: B.token, body: { text: "Привет, A!" } },
  );
  check("B отвечает → 201", reply.status === 201 && reply.body.senderId === B.id);

  const threadA = await api<Array<{ text: string }>>(
    "GET",
    `/matches/${matchId}/messages?limit=50`,
    { token: A.token },
  );
  check(
    "A видит оба сообщения в переписке",
    threadA.body.some((m) => m.text === "Привет, B!") && threadA.body.some((m) => m.text === "Привет, A!"),
  );
  const [msgCount] = await db<{ count: string }>(
    `SELECT count(*)::text AS count FROM messages WHERE "matchId" = $1`,
    [matchId],
  );
  check("БД: 2 сообщения в переписке", msgCount?.count === "2", `count=${msgCount?.count}`);

  // ── Scenario 6: validation & auth guards the UI relies on ────────────────
  section("Сценарий 6 — валидация и авторизация");
  const noAuth = await api("GET", "/profile/me");
  check("GET /profile/me без токена → 401", noAuth.status === 401, `status=${noAuth.status}`);
  const selfSwipe = await api("POST", "/swipes", {
    token: A.token,
    body: { targetId: A.id, action: "LIKE" },
  });
  check("Свайп по себе → 400", selfSwipe.status === 400, `status=${selfSwipe.status}`);
  const dupSwipe = await api<{ duplicate?: boolean }>("POST", "/swipes", {
    token: A.token,
    body: { targetId: B.id, action: "LIKE" },
  });
  check("Повторный свайп A→B → duplicate:true", dupSwipe.body.duplicate === true);

  // ── Scenario 8: crypto escrow date (wallet, propose→accept→confirm, rating) ─
  section("Сценарий 8 — свидание за токены (кошелёк, эскроу 80/20, рейтинг)");
  const balance = async (token: string): Promise<number> => {
    const w = await api<{ balance: string }>("GET", "/wallet", { token });
    return Number(w.body.balance);
  };
  // Provision + read wallets.
  const fWallet = await api<{ address: string; balance: string }>("GET", "/wallet", {
    token: F.token,
  });
  check("GET /wallet выдаёт адрес и баланс DATE", Boolean(fWallet.body.address) && Number(fWallet.body.balance) > 0);
  await balance(G.token); // provision G

  const fBefore = await balance(F.token);
  const gBefore = await balance(G.token);

  const propose = await api<{ id: string; status: string }>("POST", "/dates", {
    token: F.token,
    body: { inviteeId: G.id, amount: 100, message: "Кофе?" },
  });
  check("F предлагает свидание → PROPOSED", propose.body.status === "PROPOSED");
  const dateId = propose.body.id;
  check("После propose баланс F не изменился (заморозки нет)", (await balance(F.token)) === fBefore);
  check("Уведомление DATE_PROPOSED получателю G", await waitNotif(G.token, "DATE_PROPOSED"));

  const accept = await api<{ status: string }>("POST", `/dates/${dateId}/accept`, { token: G.token });
  check("G соглашается → ACCEPTED", accept.body.status === "ACCEPTED");
  check("После accept у F заморожено 100 (−100)", (await balance(F.token)) === fBefore - 100);
  check("Уведомление DATE_ACCEPTED инициатору F", await waitNotif(F.token, "DATE_ACCEPTED"));

  const confirm = await api<{ status: string }>("POST", `/dates/${dateId}/confirm`, { token: F.token });
  check("F подтверждает → CONFIRMED", confirm.body.status === "CONFIRMED");
  check("G получил 80% (+80)", (await balance(G.token)) === gBefore + 80);
  check("F потратил ровно 100 суммарно", (await balance(F.token)) === fBefore - 100);
  check("Уведомление DATE_CONFIRMED получателю G", await waitNotif(G.token, "DATE_CONFIRMED"));

  // Rating after confirmed date.
  const rate = await api<{ score: number }>("POST", `/dates/${dateId}/rating`, {
    token: F.token,
    body: { score: 5, comment: "Супер!" },
  });
  check("F оценивает G после свидания (5)", rate.body.score === 5);
  const gRating = await api<{ average: number; count: number }>("GET", `/users/${G.id}/rating`, {
    token: F.token,
  });
  check("Средний рейтинг G учитывает оценку", gRating.body.average === 5 && gRating.body.count >= 1);
  const rateEarly = await api("POST", `/dates/${dateId}/rating`, {
    token: F.token,
    body: { score: 3 },
  });
  check("Повторная оценка того же свидания → 409", rateEarly.status === 409, `status=${rateEarly.status}`);

  const datesF = await api<Array<{ id: string; role: string; status: string }>>("GET", "/dates", {
    token: F.token,
  });
  check(
    "GET /dates (F) показывает свидание как proposer/CONFIRMED",
    datesF.body.some((d) => d.id === dateId && d.role === "proposer" && d.status === "CONFIRMED"),
  );

  // ── Scenario 9: cancel after acceptance charges the 20% penalty ──────────
  section("Сценарий 9 — отмена после согласия (штраф 20%)");
  const fBefore2 = await balance(F.token);
  const gBefore2 = await balance(G.token);
  const propose2 = await api<{ id: string }>("POST", "/dates", {
    token: F.token,
    body: { inviteeId: G.id, amount: 200 },
  });
  const dateId2 = propose2.body.id;
  await api("POST", `/dates/${dateId2}/accept`, { token: G.token });
  check("После accept у F заморожено 200 (−200)", (await balance(F.token)) === fBefore2 - 200);
  const cancel = await api<{ status: string }>("POST", `/dates/${dateId2}/cancel`, { token: F.token });
  check("F отменяет → CANCELLED", cancel.body.status === "CANCELLED");
  check("Штраф 20%: F потерял 40 (возврат 160)", (await balance(F.token)) === fBefore2 - 40);
  check("G не получил ничего при отмене", (await balance(G.token)) === gBefore2);
  check("Уведомление DATE_CANCELLED получателю G", await waitNotif(G.token, "DATE_CANCELLED"));

  // Hide crypto scenario accounts from real decks.
  await db(`UPDATE profiles SET discoverable = false WHERE "userId" = ANY($1)`, [[F.id, G.id]]);

  // ── Scenario 7: super like (notify + deck priority + flag) ───────────────
  section("Сценарий 7 — суперлайк (уведомление, приоритет, флаг)");
  // D (муж) и E (жен) — совместимы и рядом; E остаётся видимой (discoverable).
  await api("PUT", "/profile/me", {
    token: D.token,
    body: {
      displayName: "Супер D",
      birthDate: "1992-02-02",
      gender: "MAN",
      interestedIn: ["WOMAN"],
      lat: 55.75,
      lng: 37.61,
      radiusKm: 150,
      ageMin: 21,
      ageMax: 50,
      discoverable: true,
    },
  });
  await api("PUT", "/profile/me", {
    token: E.token,
    body: {
      displayName: "Супер E",
      birthDate: "1994-04-04",
      gender: "WOMAN",
      interestedIn: ["MAN"],
      lat: 55.75,
      lng: 37.61,
      radiusKm: 150,
      ageMin: 21,
      ageMax: 50,
      discoverable: true,
    },
  });

  const superLike = await api<{ matched: boolean }>("POST", "/swipes", {
    token: D.token,
    body: { targetId: E.id, action: "SUPER_LIKE" },
  });
  check("D суперлайкает E → matched:false (нет взаимности)", superLike.body.matched === false);
  const [slRow] = await db<{ action: string }>(
    `SELECT action FROM swipes WHERE "actorId" = $1 AND "targetId" = $2`,
    [D.id, E.id],
  );
  check("БД: свайп записан с action=SUPER_LIKE", slRow?.action === "SUPER_LIKE");

  check("Уведомление SUPER_LIKE пришло получателю E", await waitNotif(E.token, "SUPER_LIKE"));
  const [slNotif] = await db<{ payload: { fromUserId?: string } }>(
    `SELECT payload FROM notifications WHERE "userId" = $1 AND type = 'SUPER_LIKE'`,
    [E.id],
  );
  check("БД: payload уведомления содержит fromUserId=D", slNotif?.payload?.fromUserId === D.id);

  const deckE = await api<Array<{ userId: string; superLikedYou: boolean }>>(
    "GET",
    "/discovery/deck?limit=50",
    { token: E.token },
  );
  const dInDeck = deckE.body.find((x) => x.userId === D.id);
  check("Дека E содержит D", Boolean(dInDeck));
  check("У D в деке E флаг superLikedYou=true", dInDeck?.superLikedYou === true);
  check("Суперлайкнувший D — первым в колоде E", deckE.body[0]?.userId === D.id);

  // Hide scenario D/E from real users' decks now that the checks are done.
  await db(`UPDATE profiles SET discoverable = false WHERE "userId" = ANY($1)`, [[D.id, E.id]]);

  await ds.destroy();

  // ── summary ───────────────────────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log(
    `\n\x1b[1mИтог:\x1b[0m ${passed} passed, ${failed} failed` +
      (failed ? `\n\x1b[31mFailed:\x1b[0m ${failures.join("; ")}` : ""),
  );
  process.exit(failed ? 1 : 0);
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
