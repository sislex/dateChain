import { BadRequestException } from "@nestjs/common";

import { ReportCategory, ReportStatus, computeReportPriority } from "./report.entity";
import { ReportService } from "./report.service";

describe("computeReportPriority", () => {
  it("escalates with prior open reports, capped at 5", () => {
    expect(computeReportPriority(ReportCategory.Spam, 0)).toBe(1);
    expect(computeReportPriority(ReportCategory.Spam, 3)).toBe(4);
    expect(computeReportPriority(ReportCategory.Spam, 10)).toBe(5);
  });

  it("always maxes out UNDERAGE reports", () => {
    expect(computeReportPriority(ReportCategory.Underage, 0)).toBe(5);
  });
});

describe("ReportService", () => {
  function setup() {
    const rows: unknown[] = [];
    const repo = {
      count: jest.fn().mockResolvedValue(2),
      create: jest.fn((p: object) => p),
      save: jest.fn((r: object) => {
        rows.push(r);
        return Promise.resolve({ id: "r1", ...r });
      }),
    };
    return { service: new ReportService(repo as never), repo, rows };
  }

  it("creates an open report with computed priority", async () => {
    const { service } = setup();
    const report = await service.create("reporter", {
      reportedId: "bad",
      category: ReportCategory.Abuse,
    });
    expect(report.status).toBe(ReportStatus.Open);
    expect(report.priority).toBe(3); // 1 + 2 prior open
  });

  it("rejects self-reports", async () => {
    const { service } = setup();
    await expect(
      service.create("u1", { reportedId: "u1", category: ReportCategory.Spam }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
