import type { MigrationInterface, QueryRunner } from "typeorm";

export class DiscoveryTables1720000300000 implements MigrationInterface {
  name = "DiscoveryTables1720000300000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD COLUMN "radiusKm" integer NOT NULL DEFAULT 80`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD COLUMN "ageMin" integer NOT NULL DEFAULT 18`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD COLUMN "ageMax" integer NOT NULL DEFAULT 100`,
    );

    await queryRunner.query(`CREATE TYPE "swipe_action_enum" AS ENUM ('NOPE','LIKE','SUPER_LIKE')`);
    await queryRunner.query(`
      CREATE TABLE "swipes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "actorId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "targetId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "action" "swipe_action_enum" NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_swipe_actor_target" ON "swipes" ("actorId","targetId")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_swipe_actor" ON "swipes" ("actorId")`);
    await queryRunner.query(`CREATE INDEX "idx_swipe_target" ON "swipes" ("targetId")`);

    await queryRunner.query(`
      CREATE TABLE "blocks" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "blockerId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "blockedId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_block_pair" ON "blocks" ("blockerId","blockedId")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_block_blocker" ON "blocks" ("blockerId")`);
    await queryRunner.query(`CREATE INDEX "idx_block_blocked" ON "blocks" ("blockedId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "blocks"`);
    await queryRunner.query(`DROP TABLE "swipes"`);
    await queryRunner.query(`DROP TYPE "swipe_action_enum"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "ageMax"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "ageMin"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "radiusKm"`);
  }
}
