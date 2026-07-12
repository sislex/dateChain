import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";

import { DateStatus } from "../dates/date.entity";

import { RatingsService } from "./ratings.service";

function make(dateRow: unknown, existing: unknown = null) {
  const ratings = {
    findOne: jest.fn().mockResolvedValue(existing),
    create: jest.fn((p: object) => p),
    save: jest.fn((p: object) => Promise.resolve({ id: "r1", ...p })),
  };
  const dates = { findOne: jest.fn().mockResolvedValue(dateRow) };
  const service = new RatingsService(ratings as never, dates as never);
  return { service, ratings, dates };
}

const confirmed = {
  id: "d1",
  proposerId: "A",
  inviteeId: "B",
  status: DateStatus.Confirmed,
};

describe("RatingsService.rate", () => {
  it("stores a rating for the counterpart on a confirmed date", async () => {
    const { service } = make(confirmed);
    const r = await service.rate("d1", "A", 5, "great");
    expect(r).toMatchObject({ raterId: "A", rateeId: "B", score: 5 });
  });

  it("rejects a score outside 1..5", async () => {
    const { service } = make(confirmed);
    await expect(service.rate("d1", "A", 6)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("forbids a non-participant", async () => {
    const { service } = make(confirmed);
    await expect(service.rate("d1", "Z", 5)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("only allows rating a confirmed date", async () => {
    const { service } = make({ ...confirmed, status: DateStatus.Accepted });
    await expect(service.rate("d1", "A", 5)).rejects.toBeInstanceOf(ConflictException);
  });

  it("prevents rating the same date twice", async () => {
    const { service } = make(confirmed, { id: "r0" });
    await expect(service.rate("d1", "A", 5)).rejects.toBeInstanceOf(ConflictException);
  });
});
