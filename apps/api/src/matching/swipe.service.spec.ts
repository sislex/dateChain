import { SwipeAction } from "@datechain/types";
import { BadRequestException, HttpException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { MATCH_CREATED } from "./events";
import { MatchService } from "./match.service";
import { Swipe } from "./swipe.entity";
import { SwipeService } from "./swipe.service";

function makeService() {
  const rows: Swipe[] = [];
  const swipesRepo = {
    findOne: jest.fn(({ where, order }: { where: Record<string, unknown>; order?: unknown }) => {
      let found = rows.filter((r) =>
        Object.entries(where).every(([k, v]) => {
          if (k === "action" && v && typeof v === "object" && "_value" in (v as object)) {
            return (v as { _value: string[] })._value.includes((r as never)[k]);
          }
          if (k === "createdAt") return true;
          return (r as never)[k] === v;
        }),
      );
      if (order) found = found.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return Promise.resolve(found[0] ?? null);
    }),
    count: jest.fn(({ where }: { where: { actorId: string } }) =>
      Promise.resolve(rows.filter((r) => r.actorId === where.actorId).length),
    ),
    create: jest.fn((p: Partial<Swipe>) => ({ ...p, createdAt: new Date() }) as Swipe),
    save: jest.fn((s: Swipe) => {
      rows.push(s);
      return Promise.resolve(s);
    }),
    delete: jest.fn(() => Promise.resolve({})),
  };
  const matches = {
    createForPair: jest.fn().mockResolvedValue({ id: "m1", userAId: "a", userBId: "b" }),
    listForUser: jest.fn().mockResolvedValue([]),
  } as unknown as MatchService;
  const events = { emit: jest.fn() } as unknown as EventEmitter2;
  const config = {
    get: jest.fn((key: string, def?: unknown) => (key === "DAILY_LIKE_LIMIT" ? 100 : def)),
  } as unknown as ConfigService;
  const service = new SwipeService(swipesRepo as never, matches, events, config);
  return { service, swipesRepo, matches, events, config, rows };
}

describe("SwipeService", () => {
  it("rejects self-swipes", async () => {
    const { service } = makeService();
    await expect(service.swipe("u1", "u1", SwipeAction.Like)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("records a like without a reciprocal → no match", async () => {
    const { service, events } = makeService();
    const res = await service.swipe("u1", "u2", SwipeAction.Like);
    expect(res.matched).toBe(false);
    expect(events.emit).not.toHaveBeenCalled();
  });

  it("creates a match and emits an event on a reciprocal like", async () => {
    const { service, events, rows } = makeService();
    rows.push({
      id: "s0",
      actorId: "u2",
      targetId: "u1",
      action: SwipeAction.Like,
      createdAt: new Date(),
    });
    const res = await service.swipe("u1", "u2", SwipeAction.Like);
    expect(res.matched).toBe(true);
    expect(res.matchId).toBe("m1");
    expect(events.emit).toHaveBeenCalledWith(
      MATCH_CREATED,
      expect.objectContaining({ matchId: "m1" }),
    );
  });

  it("is idempotent on a duplicate swipe (no new row)", async () => {
    const { service, swipesRepo, rows } = makeService();
    rows.push({
      id: "s1",
      actorId: "u1",
      targetId: "u2",
      action: SwipeAction.Like,
      createdAt: new Date(),
    });
    const res = await service.swipe("u1", "u2", SwipeAction.Like);
    expect(res.duplicate).toBe(true);
    expect(swipesRepo.save).not.toHaveBeenCalled();
  });

  it("enforces the daily like limit with 429", async () => {
    const { service, config, rows } = makeService();
    (config.get as jest.Mock).mockImplementation((k: string, d?: unknown) =>
      k === "DAILY_LIKE_LIMIT" ? 1 : d,
    );
    rows.push({
      id: "s1",
      actorId: "u1",
      targetId: "x",
      action: SwipeAction.Like,
      createdAt: new Date(),
    });
    await expect(service.swipe("u1", "u2", SwipeAction.Like)).rejects.toBeInstanceOf(HttpException);
  });

  it("does not count NOPE against the like limit and never matches", async () => {
    const { service, events } = makeService();
    const res = await service.swipe("u1", "u2", SwipeAction.Nope);
    expect(res.matched).toBe(false);
    expect(events.emit).not.toHaveBeenCalled();
  });
});
