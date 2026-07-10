import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Report, ReportCategory, ReportStatus, computeReportPriority } from "./report.entity";

export interface CreateReportInput {
  reportedId: string;
  category: ReportCategory;
  reason?: string;
}

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report)
    private readonly reports: Repository<Report>,
  ) {}

  async create(reporterId: string, input: CreateReportInput): Promise<Report> {
    if (reporterId === input.reportedId) {
      throw new BadRequestException("Cannot report yourself");
    }
    const priorOpen = await this.reports.count({
      where: { reportedId: input.reportedId, status: ReportStatus.Open },
    });
    return this.reports.save(
      this.reports.create({
        reporterId,
        reportedId: input.reportedId,
        category: input.category,
        reason: input.reason ?? null,
        status: ReportStatus.Open,
        priority: computeReportPriority(input.category, priorOpen),
      }),
    );
  }

  /** Moderation queue: open reports, highest priority and oldest first. */
  listQueue(limit = 50): Promise<Report[]> {
    return this.reports.find({
      where: { status: ReportStatus.Open },
      order: { priority: "DESC", createdAt: "ASC" },
      take: Math.min(limit, 200),
    });
  }

  async resolve(
    reportId: string,
    moderatorId: string,
    status: ReportStatus.Resolved | ReportStatus.Dismissed,
    resolution?: string,
  ): Promise<Report> {
    const report = await this.reports.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException("Report not found");
    report.status = status;
    report.resolution = resolution ?? null;
    report.resolvedById = moderatorId;
    report.resolvedAt = new Date();
    return this.reports.save(report);
  }
}
