import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum DateStatus {
  Proposed = "PROPOSED",
  Accepted = "ACCEPTED",
  Confirmed = "CONFIRMED",
  Cancelled = "CANCELLED",
  Declined = "DECLINED",
}

/**
 * A "date for tokens" between a proposer and an invitee, mirroring the on-chain
 * escrow (`escrowId`). Status transitions follow the escrow lifecycle.
 */
@Entity("dates")
@Index("idx_date_proposer", ["proposerId"])
@Index("idx_date_invitee", ["inviteeId"])
export class DateEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  proposerId!: string;

  @Column({ type: "uuid" })
  inviteeId!: string;

  /** Chat thread (match) opened for this proposal. */
  @Column({ type: "uuid", nullable: true })
  matchId!: string | null;

  /** Amount in whole DATE (human units), as a string. */
  @Column({ type: "varchar", length: 78 })
  amount!: string;

  /** On-chain escrow id. */
  @Column({ type: "bigint" })
  escrowId!: string;

  @Column({ type: "enum", enum: DateStatus, default: DateStatus.Proposed })
  status!: DateStatus;

  @Column({ type: "text", nullable: true })
  message!: string | null;

  /** When the date is planned to happen (chosen by the proposer). */
  @Column({ type: "timestamptz", nullable: true })
  scheduledAt!: Date | null;

  /** Where the date is planned to happen. */
  @Column({ type: "varchar", length: 200, nullable: true })
  location!: string | null;

  /** When the invitee accepted — starts the on-chain claim timer. */
  @Column({ type: "timestamptz", nullable: true })
  acceptedAt!: Date | null;

  /** When the "claim available" notification was sent (job bookkeeping). */
  @Column({ type: "timestamptz", nullable: true })
  claimNotifiedAt!: Date | null;

  /** When the day-of-date reminder was sent (job bookkeeping). */
  @Column({ type: "timestamptz", nullable: true })
  reminderSentAt!: Date | null;

  @Column({ type: "varchar", length: 66, nullable: true })
  proposeTx!: string | null;

  @Column({ type: "varchar", length: 66, nullable: true })
  settleTx!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
