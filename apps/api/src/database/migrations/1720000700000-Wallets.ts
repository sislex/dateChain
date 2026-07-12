import type { MigrationInterface, QueryRunner } from "typeorm";

export class Wallets1720000700000 implements MigrationInterface {
  name = "Wallets1720000700000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "wallets" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "address" varchar(42) NOT NULL,
        "privkeyEnc" text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_wallet_user" ON "wallets" ("userId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_wallet_address" ON "wallets" ("address")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "wallets"`);
  }
}
