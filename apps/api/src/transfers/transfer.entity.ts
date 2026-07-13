import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/** A peer-to-peer DATE transfer with a service commission. Amounts in whole DATE. */
@Entity("transfers")
@Index("idx_transfer_from", ["fromId"])
@Index("idx_transfer_to", ["toId"])
export class Transfer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  fromId!: string;

  @Column({ type: "uuid" })
  toId!: string;

  /** Gross amount the sender paid (human DATE). */
  @Column({ type: "varchar", length: 78 })
  amount!: string;

  /** Commission taken by the service (human DATE). */
  @Column({ type: "varchar", length: 78 })
  fee!: string;

  /** Net amount the recipient received (human DATE). */
  @Column({ type: "varchar", length: 78 })
  net!: string;

  @Column({ type: "int" })
  feeBps!: number;

  @Column({ type: "varchar", length: 66, nullable: true })
  txHash!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
