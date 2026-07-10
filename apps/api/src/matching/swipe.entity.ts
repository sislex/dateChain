import { SwipeAction } from "@datechain/types";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/** A directional swipe by `actor` on `target`. One per pair (idempotent). */
@Entity("swipes")
@Index("uq_swipe_actor_target", ["actorId", "targetId"], { unique: true })
export class Swipe {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  actorId!: string;

  @Index()
  @Column({ type: "uuid" })
  targetId!: string;

  @Column({ type: "enum", enum: SwipeAction })
  action!: SwipeAction;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
