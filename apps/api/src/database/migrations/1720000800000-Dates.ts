import type { MigrationInterface, QueryRunner } from "typeorm";

export class Dates1720000800000 implements MigrationInterface {
  name = "Dates1720000800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "date_status_enum" AS ENUM ('PROPOSED','ACCEPTED','CONFIRMED','CANCELLED','DECLINED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "dates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "proposerId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "inviteeId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "matchId" uuid REFERENCES "matches"("id") ON DELETE SET NULL,
        "amount" varchar(78) NOT NULL,
        "escrowId" bigint NOT NULL,
        "status" "date_status_enum" NOT NULL DEFAULT 'PROPOSED',
        "message" text,
        "proposeTx" varchar(66),
        "settleTx" varchar(66),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_date_proposer" ON "dates" ("proposerId")`);
    await queryRunner.query(`CREATE INDEX "idx_date_invitee" ON "dates" ("inviteeId")`);

    // Extend notification types for date lifecycle events.
    for (const value of [
      "DATE_PROPOSED",
      "DATE_ACCEPTED",
      "DATE_DECLINED",
      "DATE_CONFIRMED",
      "DATE_CANCELLED",
    ]) {
      await queryRunner.query(`ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS '${value}'`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "dates"`);
    await queryRunner.query(`DROP TYPE "date_status_enum"`);
  }
}
