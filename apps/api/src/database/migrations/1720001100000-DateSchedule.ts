import type { MigrationInterface, QueryRunner } from "typeorm";

export class DateSchedule1720001100000 implements MigrationInterface {
  name = "DateSchedule1720001100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dates" ADD COLUMN "scheduledAt" timestamptz`);
    await queryRunner.query(`ALTER TABLE "dates" ADD COLUMN "location" varchar(200)`);
    await queryRunner.query(`ALTER TABLE "dates" ADD COLUMN "acceptedAt" timestamptz`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "dates" DROP COLUMN "acceptedAt"`);
    await queryRunner.query(`ALTER TABLE "dates" DROP COLUMN "location"`);
    await queryRunner.query(`ALTER TABLE "dates" DROP COLUMN "scheduledAt"`);
  }
}
