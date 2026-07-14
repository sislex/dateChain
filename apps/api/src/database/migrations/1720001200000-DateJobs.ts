import type { MigrationInterface, QueryRunner } from "typeorm";

export class DateJobs1720001200000 implements MigrationInterface {
  name = "DateJobs1720001200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const value of ["DATE_CLAIM_AVAILABLE", "DATE_REMINDER"]) {
      await queryRunner.query(
        `ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS '${value}'`,
      );
    }
    // Job bookkeeping: when the claim-available / reminder notification went out.
    await queryRunner.query(`ALTER TABLE "dates" ADD COLUMN "claimNotifiedAt" timestamptz`);
    await queryRunner.query(`ALTER TABLE "dates" ADD COLUMN "reminderSentAt" timestamptz`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dates" DROP COLUMN "reminderSentAt"`);
    await queryRunner.query(`ALTER TABLE "dates" DROP COLUMN "claimNotifiedAt"`);
    // enum values are left in place — Postgres cannot drop them cheaply
  }
}
