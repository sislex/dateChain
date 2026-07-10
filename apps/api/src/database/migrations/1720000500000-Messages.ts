import type { MigrationInterface, QueryRunner } from "typeorm";

export class Messages1720000500000 implements MigrationInterface {
  name = "Messages1720000500000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "message_type_enum" AS ENUM ('TEXT','IMAGE')`);
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "matchId" uuid NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
        "senderId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" "message_type_enum" NOT NULL DEFAULT 'TEXT',
        "text" text,
        "imageStorageKey" varchar(200),
        "readAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_messages_match" ON "messages" ("matchId")`);
    await queryRunner.query(`CREATE INDEX "idx_messages_sender" ON "messages" ("senderId")`);
    await queryRunner.query(
      `CREATE INDEX "idx_messages_match_created" ON "messages" ("matchId","createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TYPE "message_type_enum"`);
  }
}
