import { config as loadEnv } from "dotenv";
import Redis from "ioredis";

/**
 * Replaces the placeholder photos of the test users with real portrait photos
 * (randomuser.me) via the RUNNING API. Re-runnable: clears existing photos first.
 *
 * Run: pnpm --filter @datechain/api exec ts-node src/scripts/set-test-user-photos.ts
 */
loadEnv({ path: [".env", "../../.env"] });

const API = process.env.TEST_API_URL ?? "http://localhost:3000";
const redis = new Redis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
});
redis.on("error", () => undefined);

const USERS: Array<{ phone: string; portraits: string[] }> = [
  {
    phone: "+79990000101", // Анна
    portraits: [
      "https://randomuser.me/api/portraits/women/44.jpg",
      "https://randomuser.me/api/portraits/women/68.jpg",
    ],
  },
  {
    phone: "+79990000102", // Борис
    portraits: [
      "https://randomuser.me/api/portraits/men/32.jpg",
      "https://randomuser.me/api/portraits/men/75.jpg",
    ],
  },
  {
    phone: "+79990000103", // Вера
    portraits: [
      "https://randomuser.me/api/portraits/women/12.jpg",
      "https://randomuser.me/api/portraits/women/90.jpg",
    ],
  },
];

async function login(phone: string): Promise<string> {
  await fetch(`${API}/auth/otp/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel: "phone", identifier: phone }),
  });
  const code = await redis.get(`otp:phone:${phone}`);
  const res = (await fetch(`${API}/auth/otp/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ channel: "phone", identifier: phone, code }),
  }).then((r) => r.json())) as { tokens: { accessToken: string } };
  return res.tokens.accessToken;
}

async function run(phone: string, portraits: string[]): Promise<void> {
  const token = await login(phone);
  const auth = { Authorization: `Bearer ${token}` };

  // Clear existing photos.
  const existing = (await fetch(`${API}/profile/me/photos`, { headers: auth }).then((r) =>
    r.json(),
  )) as Array<{ id: string }>;
  for (const p of existing) {
    await fetch(`${API}/profile/me/photos/${p.id}`, { method: "DELETE", headers: auth });
  }

  // Upload real portraits.
  for (const url of portraits) {
    const img = await fetch(url).then((r) => r.arrayBuffer());
    const form = new FormData();
    form.append("file", new Blob([img], { type: "image/jpeg" }), "portrait.jpg");
    const up = await fetch(`${API}/profile/me/photos`, { method: "POST", headers: auth, body: form });
    if (!up.ok) throw new Error(`upload failed (${up.status}) for ${phone}`);
  }
}

async function main(): Promise<void> {
  for (const u of USERS) {
    // eslint-disable-next-line no-console
    console.log(`Setting real photos for ${u.phone}…`);
    await run(u.phone, u.portraits);
  }
  redis.disconnect();
  // eslint-disable-next-line no-console
  console.log("Done — test users now have real portrait photos.");
}

void main().then(
  () => process.exit(0),
  (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  },
);
