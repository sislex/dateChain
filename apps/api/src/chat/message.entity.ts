import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export enum MessageType {
  Text = "TEXT",
  Image = "IMAGE",
}

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  matchId!: string;

  @Index()
  @Column({ type: "uuid" })
  senderId!: string;

  @Column({ type: "enum", enum: MessageType, default: MessageType.Text })
  type!: MessageType;

  @Column({ type: "text", nullable: true })
  text!: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  imageStorageKey!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
