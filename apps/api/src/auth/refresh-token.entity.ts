import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * One row per issued refresh token (i.e. per session). Rotation marks the old
 * row revoked and links `replacedByTokenId`; reuse of a revoked token is a
 * theft signal and revokes the whole `family`.
 */
@Entity("refresh_tokens")
export class RefreshToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  userId!: string;

  /** sha256 hash of the opaque refresh token (never store the raw token). */
  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  tokenHash!: string;

  /** Shared across a rotation chain so theft can revoke the entire lineage. */
  @Index()
  @Column({ type: "uuid" })
  family!: string;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @Column({ type: "uuid", nullable: true })
  replacedByTokenId!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
