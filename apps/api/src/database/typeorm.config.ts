import { join } from "node:path";

import type { DataSourceOptions } from "typeorm";

export interface DbEnv {
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
}

/**
 * Single source of truth for TypeORM connection options, shared by the Nest
 * runtime module and the migration CLI. `synchronize` is always false —
 * schema changes go through migrations only.
 */
export function buildDataSourceOptions(env: DbEnv): DataSourceOptions {
  return {
    type: "postgres",
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    username: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
    synchronize: false,
    entities: [join(__dirname, "..", "**", "*.entity.{ts,js}")],
    migrations: [join(__dirname, "migrations", "*.{ts,js}")],
    migrationsTableName: "_migrations",
  };
}
