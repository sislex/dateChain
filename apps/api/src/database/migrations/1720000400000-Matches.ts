import type { MigrationInterface, QueryRunner } from "typeorm";

export class Matches1720000400000 implements MigrationInterface {
  name = "Matches1720000400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "matches" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userAId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "userBId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "unmatchedAt" timestamptz,
        "unmatchedBy" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "chk_match_order" CHECK ("userAId" < "userBId")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_match_pair" ON "matches" ("userAId","userBId")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_match_userA" ON "matches" ("userAId")`);
    await queryRunner.query(`CREATE INDEX "idx_match_userB" ON "matches" ("userBId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "matches"`);
  }
}
