import type { MigrationInterface, QueryRunner } from "typeorm";

export class Ratings1720000900000 implements MigrationInterface {
  name = "Ratings1720000900000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ratings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "dateId" uuid NOT NULL REFERENCES "dates"("id") ON DELETE CASCADE,
        "raterId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "rateeId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "score" smallint NOT NULL,
        "comment" text,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_rating_date_rater" ON "ratings" ("dateId","raterId")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_rating_ratee" ON "ratings" ("rateeId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ratings"`);
  }
}
