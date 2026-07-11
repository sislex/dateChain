import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { Gender } from "@datechain/types";
import { config as loadEnv } from "dotenv";
import Redis from "ioredis";
import sharp from "sharp";

/**
 * Creates fully-populated test users against a RUNNING API (default :3000),
 * reading OTP codes from Redis, and writes their credentials + a ready-to-paste
 * localStorage snapshot to the "тестовые пользователи" folder at the repo root.
 *
 * Run: pnpm --filter @datechain/api exec ts-node src/scripts/create-test-users.ts
 * (requires: docker compose up, api running, migrations applied)
 */
loadEnv({ path: [".env", "../../.env"] });

const API = process.env.TEST_API_URL ?? "http://localhost:3000";
const redis = new Redis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
});
redis.on("error", () => undefined);

interface TestUserSpec {
  displayName: string;
  phone: string;
  gender: Gender;
  interestedIn: Gender[];
  bio: string;
  interests: string[];
  job: string;
  school: string;
  heightCm: number;
  hue: number;
}

const USERS: TestUserSpec[] = [
  {
    displayName: "Анна",
    phone: "+79990000101",
    gender: Gender.Woman,
    interestedIn: [Gender.Man],
    bio: "Люблю кофе, книги и долгие прогулки по городу.",
    interests: ["кофе", "книги", "путешествия"],
    job: "UX-дизайнер",
    school: "МГУ",
    heightCm: 168,
    hue: 12,
  },
  {
    displayName: "Борис",
    phone: "+79990000102",
    gender: Gender.Man,
    interestedIn: [Gender.Woman],
    bio: "Горы, велосипед и хороший espresso. Ищу компанию для приключений.",
    interests: ["горы", "велоспорт", "кофе"],
    job: "Бэкенд-разработчик",
    school: "МФТИ",
    heightCm: 182,
    hue: 40,
  },
  {
    displayName: "Вера",
    phone: "+79990000103",
    gender: Gender.Woman,
    interestedIn: [Gender.Man, Gender.More],
    bio: "Художница. Обожаю выставки, джаз и готовить пасту.",
    interests: ["искусство", "джаз", "готовка"],
    job: "Иллюстратор",
    school: "Строгановка",
    heightCm: 172,
    hue: 70,
  },
];

async function makePhotoBlob(hue: number): Promise<Blob> {
  const r = (hue * 37) % 255;
  const g = (hue * 71) % 255;
  const b = (hue * 113) % 255;
  const buf = await sharp({
    create: { width: 600, height: 800, channels: 3, background: { r, g, b } },
  })
    .png()
    .toBuffer();
  return new Blob([buf], { type: "image/png" });
}

async function createUser(spec: TestUserSpec) {
  // 1. OTP request -> read code from Redis -> verify
  await fetch(`${API}/auth/otp/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel: "phone", identifier: spec.phone }),
  }).then((r) => {
    if (!r.ok) throw new Error(`otp/request failed: ${r.status}`);
  });
  const code = await redis.get(`otp:phone:${spec.phone}`);
  if (!code) throw new Error(`no OTP in redis for ${spec.phone}`);

  const verify = (await fetch(`${API}/auth/otp/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel: "phone", identifier: spec.phone, code }),
  }).then((r) => r.json())) as {
    user: { id: string; role: string };
    tokens: { accessToken: string; refreshToken: string };
  };
  const token: string = verify.tokens.accessToken;
  const auth = { Authorization: `Bearer ${token}` };

  // 2. Full profile
  await fetch(`${API}/profile/me`, {
    method: "PUT",
    headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({
      displayName: spec.displayName,
      birthDate: "1995-06-15",
      gender: spec.gender,
      interestedIn: spec.interestedIn,
      bio: spec.bio,
      interests: spec.interests,
      job: spec.job,
      school: spec.school,
      heightCm: spec.heightCm,
      lat: 55.7558,
      lng: 37.6173,
      radiusKm: 100,
      ageMin: 21,
      ageMax: 45,
    }),
  }).then((r) => {
    if (!r.ok) throw new Error(`profile PUT failed: ${r.status}`);
  });

  // 3. Two photos
  for (let i = 0; i < 2; i++) {
    const form = new FormData();
    form.append("file", await makePhotoBlob(spec.hue + i * 30), `photo${i}.png`);
    await fetch(`${API}/profile/me/photos`, { method: "POST", headers: auth, body: form }).then(
      (r) => {
        if (!r.ok) throw new Error(`photo upload failed: ${r.status}`);
      },
    );
  }

  return {
    displayName: spec.displayName,
    phone: spec.phone,
    userId: verify.user.id as string,
    role: verify.user.role as string,
    tokens: verify.tokens as { accessToken: string; refreshToken: string },
  };
}

async function main(): Promise<void> {
  const results = [];
  for (const spec of USERS) {
    // eslint-disable-next-line no-console
    console.log(`Creating ${spec.displayName} (${spec.phone})…`);
    results.push(await createUser(spec));
  }
  redis.disconnect();

  const dir = join(__dirname, "..", "..", "..", "..", "тестовые пользователи");
  mkdirSync(dir, { recursive: true });

  const md = [
    "# Тестовые пользователи dateChain",
    "",
    "Созданы скриптом `apps/api/src/scripts/create-test-users.ts` против запущенного API.",
    "Вход в приложении — по телефону (OTP). Код в dev выводится в лог API и лежит в Redis.",
    "",
    "## Аккаунты",
    "",
    "| Имя | Телефон | userId | Роль |",
    "| --- | ------- | ------ | ---- |",
    ...results.map((u) => `| ${u.displayName} | ${u.phone} | ${u.userId} | ${u.role} |`),
    "",
    "## Как войти в UI (user-web)",
    "",
    "1. Открыть user-web, «Создать аккаунт» / «Войти» → ввести телефон из таблицы.",
    "2. Получить OTP-код одной из команд:",
    "   ```bash",
    "   # из Redis (сразу после запроса кода):",
    '   docker exec datechain-redis redis-cli --raw get "otp:phone:+79990000101"',
    "   # или из лога API: строка [OtpService] OTP for phone:... = ******",
    "   ```",
    "3. Ввести код → профиль уже заполнен.",
    "",
    "## Быстрый вход без OTP (вставить в DevTools → Console на странице user-web)",
    "",
    "Токены доступа живут 15 минут; refresh — 30 дней (приложение обновит access само).",
    "",
    ...results.flatMap((u) => [
      `### ${u.displayName}`,
      "```js",
      `localStorage.setItem('datechain.auth', ${JSON.stringify(
        JSON.stringify({
          accessToken: u.tokens.accessToken,
          refreshToken: u.tokens.refreshToken,
          user: { id: u.userId, role: u.role, phone: u.phone },
        }),
      )}); location.reload();`,
      "```",
      "",
    ]),
  ].join("\n");

  writeFileSync(join(dir, "README.md"), `${md}\n`);
  writeFileSync(join(dir, "accounts.json"), `${JSON.stringify(results, null, 2)}\n`);
  // eslint-disable-next-line no-console
  console.log(`\nDone. Credentials written to "${dir}".`);
}

void main().then(
  () => process.exit(0),
  (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  },
);
