import type { MigrationInterface, QueryRunner } from "typeorm";

export class ModerationAdmin1720000600000 implements MigrationInterface {
  name = "ModerationAdmin1720000600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "report_category_enum" AS ENUM ('SPAM','ABUSE','FAKE','INAPPROPRIATE','UNDERAGE','OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "report_status_enum" AS ENUM ('OPEN','RESOLVED','DISMISSED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "reports" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "reporterId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "reportedId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "category" "report_category_enum" NOT NULL,
        "reason" text,
        "status" "report_status_enum" NOT NULL DEFAULT 'OPEN',
        "priority" integer NOT NULL DEFAULT 1,
        "resolution" text,
        "resolvedById" uuid,
        "resolvedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_reports_reporter" ON "reports" ("reporterId")`);
    await queryRunner.query(`CREATE INDEX "idx_reports_reported" ON "reports" ("reportedId")`);
    await queryRunner.query(`CREATE INDEX "idx_reports_status" ON "reports" ("status")`);

    await queryRunner.query(
      `CREATE TYPE "notification_type_enum" AS ENUM ('MATCH','MESSAGE','SUPER_LIKE','SYSTEM')`,
    );
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" "notification_type_enum" NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}',
        "readAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_notifications_user" ON "notifications" ("userId")`);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "actorId" uuid NOT NULL,
        "action" varchar(80) NOT NULL,
        "targetType" varchar(40),
        "targetId" uuid,
        "meta" jsonb NOT NULL DEFAULT '{}',
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_audit_actor" ON "audit_logs" ("actorId")`);

    await queryRunner.query(`
      CREATE TABLE "settings" (
        "key" varchar(80) PRIMARY KEY,
        "value" jsonb NOT NULL,
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "settings"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "notification_type_enum"`);
    await queryRunner.query(`DROP TABLE "reports"`);
    await queryRunner.query(`DROP TYPE "report_status_enum"`);
    await queryRunner.query(`DROP TYPE "report_category_enum"`);
  }
}
