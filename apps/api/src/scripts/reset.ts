import { config as loadEnv } from "dotenv";
import { DataSource } from "typeorm";

import { buildDataSourceOptions } from "../database/typeorm.config";

/**
 * Test helper: wipes interaction data (swipes, matches, messages, blocks,
 * reports, notifications) so every candidate reappears in discovery. Users,
 * profiles and photos are kept intact.
 *
 * Run: pnpm reset        (from repo root)
 */
loadEnv({ path: [".env", "../../.env"] });

async function main(): Promise<void> {
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
  await ds.query(
    `TRUNCATE TABLE "swipes", "matches", "messages", "blocks", "reports", "notifications" RESTART IDENTITY CASCADE`,
  );
  await ds.destroy();
  // eslint-disable-next-line no-console
  console.log("Reset done — swipes/matches/messages/blocks/reports/notifications cleared.");
}

void main().then(
  () => process.exit(0),
  (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  },
);
