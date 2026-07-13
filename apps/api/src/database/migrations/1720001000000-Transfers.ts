import type { MigrationInterface, QueryRunner } from "typeorm";

export class Transfers1720001000000 implements MigrationInterface {
  name = "Transfers1720001000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "transfers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "fromId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "toId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "amount" varchar(78) NOT NULL,
        "fee" varchar(78) NOT NULL,
        "net" varchar(78) NOT NULL,
        "feeBps" int NOT NULL,
        "txHash" varchar(66),
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_transfer_from" ON "transfers" ("fromId")`);
    await queryRunner.query(`CREATE INDEX "idx_transfer_to" ON "transfers" ("toId")`);

    await queryRunner.query(
      `ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'TRANSFER_RECEIVED'`,
    );

    // Default transfer commission: 2% (200 bps). Admin-editable.
    await queryRunner.query(
      `INSERT INTO "settings" ("key", "value") VALUES ('transfer_fee_bps', '200')
       ON CONFLICT ("key") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "transfers"`);
    await queryRunner.query(`DELETE FROM "settings" WHERE "key" = 'transfer_fee_bps'`);
  }
}
