import { UserRole } from "@datechain/types";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum UserStatus {
  Active = "ACTIVE",
  Paused = "PAUSED",
  Banned = "BANNED",
  Deleted = "DELETED",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true, where: "email IS NOT NULL" })
  @Column({ type: "varchar", length: 320, nullable: true })
  email!: string | null;

  @Index({ unique: true, where: "phone IS NOT NULL" })
  @Column({ type: "varchar", length: 32, nullable: true })
  phone!: string | null;

  @Column({ type: "enum", enum: UserRole, default: UserRole.User })
  role!: UserRole;

  @Column({ type: "enum", enum: UserStatus, default: UserStatus.Active })
  status!: UserStatus;

  /** bcrypt hash — only set for staff/admin accounts that log in with a password. */
  @Column({ type: "varchar", nullable: true, select: false })
  passwordHash!: string | null;

  /** TOTP secret for admin 2FA. */
  @Column({ type: "varchar", nullable: true, select: false })
  twoFactorSecret!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
