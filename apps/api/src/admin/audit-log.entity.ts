import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/** Append-only record of privileged admin actions. */
@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  actorId!: string;

  @Column({ type: "varchar", length: 80 })
  action!: string;

  @Column({ type: "varchar", length: 40, nullable: true })
  targetType!: string | null;

  @Column({ type: "uuid", nullable: true })
  targetId!: string | null;

  @Column({ type: "jsonb", default: {} })
  meta!: Record<string, unknown>;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
