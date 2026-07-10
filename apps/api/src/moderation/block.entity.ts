import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/** `blocker` has blocked `blocked`; both directions are excluded from discovery/chat. */
@Entity("blocks")
@Index("uq_block_pair", ["blockerId", "blockedId"], { unique: true })
export class Block {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  blockerId!: string;

  @Index()
  @Column({ type: "uuid" })
  blockedId!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
