import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Baseline migration. Ensures the required Postgres extensions exist (so a
 * fresh/test database matches the docker-provisioned one) and creates a small
 * marker table that makes up/down verifiable. Domain tables arrive in later
 * migrations (Phase 3).
 */
export class InitialBaseline1720000000000 implements MigrationInterface {
  name = "InitialBaseline1720000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "_schema_baseline" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "applied_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "_schema_baseline"`);
    // Extensions are intentionally left in place — dropping postgis is destructive
    // and other databases on the cluster may depend on it.
  }
}
