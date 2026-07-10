import type { MigrationInterface, QueryRunner } from "typeorm";

export class ProfilesAndPhotos1720000200000 implements MigrationInterface {
  name = "ProfilesAndPhotos1720000200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "gender_enum" AS ENUM ('MAN','WOMAN','MORE')`);
    await queryRunner.query(`
      CREATE TABLE "profiles" (
        "userId" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
        "displayName" varchar(100) NOT NULL,
        "birthDate" date NOT NULL,
        "gender" "gender_enum" NOT NULL,
        "interestedIn" text NOT NULL,
        "bio" text,
        "interests" text NOT NULL DEFAULT '',
        "job" varchar(120),
        "school" varchar(120),
        "heightCm" integer,
        "lookingFor" varchar(120),
        "lat" double precision,
        "lng" double precision,
        "location" geography(Point, 4326),
        "discoverable" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    // GiST index powers ST_DWithin radius queries in discovery (Phase 3.2).
    await queryRunner.query(
      `CREATE INDEX "idx_profiles_location" ON "profiles" USING GIST ("location")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_profiles_discoverable" ON "profiles" ("discoverable")`,
    );

    await queryRunner.query(`
      CREATE TABLE "photos" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "position" integer NOT NULL,
        "isMain" boolean NOT NULL DEFAULT false,
        "storageKey" varchar(200) NOT NULL,
        "width" integer NOT NULL,
        "height" integer NOT NULL,
        "blurhash" varchar(64) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_photos_user" ON "photos" ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "photos"`);
    await queryRunner.query(`DROP TABLE "profiles"`);
    await queryRunner.query(`DROP TYPE "gender_enum"`);
  }
}
