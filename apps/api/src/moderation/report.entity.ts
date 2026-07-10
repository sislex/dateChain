import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export enum ReportCategory {
  Spam = "SPAM",
  Abuse = "ABUSE",
  Fake = "FAKE",
  Inappropriate = "INAPPROPRIATE",
  Underage = "UNDERAGE",
  Other = "OTHER",
}

export enum ReportStatus {
  Open = "OPEN",
  Resolved = "RESOLVED",
  Dismissed = "DISMISSED",
}

@Entity("reports")
export class Report {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  reporterId!: string;

  @Index()
  @Column({ type: "uuid" })
  reportedId!: string;

  @Column({ type: "enum", enum: ReportCategory })
  category!: ReportCategory;

  @Column({ type: "text", nullable: true })
  reason!: string | null;

  @Index()
  @Column({ type: "enum", enum: ReportStatus, default: ReportStatus.Open })
  status!: ReportStatus;

  /** Auto-computed queue priority (higher = more urgent). */
  @Column({ type: "int", default: 1 })
  priority!: number;

  @Column({ type: "text", nullable: true })
  resolution!: string | null;

  @Column({ type: "uuid", nullable: true })
  resolvedById!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}

/**
 * Queue priority from the number of open reports already filed against the
 * reported user (repeat offenders float to the top). UNDERAGE is always max.
 */
export function computeReportPriority(category: ReportCategory, priorOpenReports: number): number {
  if (category === ReportCategory.Underage) return 5;
  return Math.min(5, 1 + priorOpenReports);
}
