import { config as loadEnv } from "dotenv";
import { DataSource } from "typeorm";

import { buildDataSourceOptions } from "../database/typeorm.config";

/**
 * "Arms" the test accounts for instant matches: clears all swipes/matches, then
 * makes every other (non-test) user LIKE each test user. Logged in as a test
 * account, any right-swipe on a seed candidate becomes an instant "It's a Match".
 * Test accounts keep an empty outgoing slate so the user triggers the match.
 *
 * Run: pnpm --filter @datechain/api likes:arm
 */
const TEST_PHONES = ["+79990000101", "+79990000102", "+79990000103"];

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

  const testUsers: Array<{ id: string }> = await ds.query(
    `SELECT id FROM users WHERE phone = ANY($1)`,
    [TEST_PHONES],
  );
  const testIds = testUsers.map((u) => u.id);
  if (testIds.length === 0) throw new Error("No test users found — run create-test-users first.");

  await ds.query(`TRUNCATE swipes, matches, messages RESTART IDENTITY CASCADE`);
  const result = await ds.query(
    `INSERT INTO swipes ("actorId", "targetId", action)
     SELECT u.id, t.id, 'LIKE'
     FROM users u
     CROSS JOIN unnest($1::uuid[]) AS t(id)
     WHERE u.id <> t.id AND u.id <> ALL($1::uuid[])`,
    [testIds],
  );

  await ds.destroy();
  const inserted = Array.isArray(result) ? result[1] : result;
  // eslint-disable-next-line no-console
  console.log(
    `Armed ${testIds.length} test accounts with incoming likes (${inserted ?? "?"} rows). ` +
      `Swipe right on any candidate to match instantly.`,
  );
}

void main().then(
  () => process.exit(0),
  (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  },
);
