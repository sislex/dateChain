import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export enum NotificationType {
  Match = "MATCH",
  Message = "MESSAGE",
  SuperLike = "SUPER_LIKE",
  System = "SYSTEM",
}

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "enum", enum: NotificationType })
  type!: NotificationType;

  @Column({ type: "jsonb", default: {} })
  payload!: Record<string, unknown>;

  @Column({ type: "timestamptz", nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}

export const NOTIFICATION_CREATED = "notification.created";

export interface NotificationCreatedEvent {
  userId: string;
  notification: Notification;
}
