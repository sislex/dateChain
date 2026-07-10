import { Gender } from "@datechain/types";
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

/**
 * Dating profile, one-to-one with a User (userId is the PK and FK).
 * `location` (PostGIS geography) is maintained via raw SQL from lat/lng and is
 * not mapped here; discovery queries it directly (Phase 3.2).
 */
@Entity("profiles")
export class Profile {
  @PrimaryColumn({ type: "uuid" })
  userId!: string;

  @Column({ type: "varchar", length: 100 })
  displayName!: string;

  @Column({ type: "date" })
  birthDate!: string;

  @Column({ type: "enum", enum: Gender })
  gender!: Gender;

  /** Genders this user wants to see in discovery. */
  @Column({ type: "simple-array" })
  interestedIn!: Gender[];

  @Column({ type: "text", nullable: true })
  bio!: string | null;

  @Column({ type: "simple-array", default: "" })
  interests!: string[];

  @Column({ type: "varchar", length: 120, nullable: true })
  job!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  school!: string | null;

  @Column({ type: "int", nullable: true })
  heightCm!: number | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  lookingFor!: string | null;

  @Column({ type: "double precision", nullable: true })
  lat!: number | null;

  @Column({ type: "double precision", nullable: true })
  lng!: number | null;

  /** Hidden from discovery when false (privacy / paused). */
  @Column({ type: "boolean", default: true })
  discoverable!: boolean;

  /** Discovery preferences. */
  @Column({ type: "int", default: 80 })
  radiusKm!: number;

  @Column({ type: "int", default: 18 })
  ageMin!: number;

  @Column({ type: "int", default: 100 })
  ageMax!: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
