import type { MigrationInterface, QueryRunner } from "typeorm";

export class AuthTables1720000100000 implements MigrationInterface {
  name = "AuthTables1720000100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM
        ('USER','SUPPORT','ANALYST','MODERATOR','ADMIN','SUPER_ADMIN')
    `);
    await queryRunner.query(`
      CREATE TYPE "user_status_enum" AS ENUM ('ACTIVE','PAUSED','BANNED','DELETED')
    `);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar(320),
        "phone" varchar(32),
        "role" "user_role_enum" NOT NULL DEFAULT 'USER',
        "status" "user_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "passwordHash" varchar,
        "twoFactorSecret" varchar,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email") WHERE email IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_phone" ON "users" ("phone") WHERE phone IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "tokenHash" varchar(64) NOT NULL,
        "family" uuid NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "revokedAt" timestamptz,
        "replacedByTokenId" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_refresh_token_hash" ON "refresh_tokens" ("tokenHash")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_refresh_user" ON "refresh_tokens" ("userId")`);
    await queryRunner.query(`CREATE INDEX "idx_refresh_family" ON "refresh_tokens" ("family")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "user_status_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
