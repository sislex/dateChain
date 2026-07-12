import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/** A rating one date participant leaves for the other after a confirmed date. */
@Entity("ratings")
@Index("uq_rating_date_rater", ["dateId", "raterId"], { unique: true })
@Index("idx_rating_ratee", ["rateeId"])
export class Rating {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  dateId!: string;

  @Column({ type: "uuid" })
  raterId!: string;

  @Column({ type: "uuid" })
  rateeId!: string;

  @Column({ type: "smallint" })
  score!: number;

  @Column({ type: "text", nullable: true })
  comment!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
