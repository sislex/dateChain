import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * A mutual match. The pair is stored canonically (userAId < userBId) with a
 * unique index so a match can only exist once regardless of who liked first.
 */
@Entity("matches")
@Index("uq_match_pair", ["userAId", "userBId"], { unique: true })
export class Match {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  userAId!: string;

  @Index()
  @Column({ type: "uuid" })
  userBId!: string;

  @Column({ type: "timestamptz", nullable: true })
  unmatchedAt!: Date | null;

  /** Who initiated the unmatch (for audit), null while active. */
  @Column({ type: "uuid", nullable: true })
  unmatchedBy!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}

/** Orders a pair of ids canonically so a match is unique per unordered pair. */
export function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}
