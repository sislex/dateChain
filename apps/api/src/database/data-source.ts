import { config as loadEnv } from "dotenv";
import { DataSource } from "typeorm";

import { buildDataSourceOptions } from "./typeorm.config";

// Used by the TypeORM CLI (migration:run / revert / generate). Loads .env from
// the app dir and the repo root so the same config works locally and in CI.
loadEnv({ path: [".env", "../../.env"] });

export default new DataSource(
  buildDataSourceOptions({
    POSTGRES_HOST: process.env.POSTGRES_HOST ?? "localhost",
    POSTGRES_PORT: Number(process.env.POSTGRES_PORT ?? 5432),
    POSTGRES_USER: process.env.POSTGRES_USER ?? "datechain",
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ?? "datechain",
    POSTGRES_DB: process.env.POSTGRES_DB ?? "datechain",
  }),
);
