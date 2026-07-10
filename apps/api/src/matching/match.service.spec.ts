import { ForbiddenException, NotFoundException } from "@nestjs/common";

import { Match, canonicalPair } from "./match.entity";
import { MatchService } from "./match.service";

describe("canonicalPair", () => {
  it("orders ids deterministically regardless of argument order", () => {
    expect(canonicalPair("b", "a")).toEqual(["a", "b"]);
    expect(canonicalPair("a", "b")).toEqual(["a", "b"]);
  });
});

function makeService() {
  const rows: Match[] = [];
  const repo = {
    findOne: jest.fn(({ where }: { where: Partial<Match> }) =>
      Promise.resolve(
        rows.find((r) =>
          Object.entries(where).every(([k, v]) => {
            if (v && typeof v === "object" && "_type" in (v as object))
              return r.unmatchedAt === null;
            return (r as never)[k] === v;
          }),
        ) ?? null,
      ),
    ),
    create: jest.fn((p: Partial<Match>) => ({ ...p }) as Match),
    save: jest.fn((m: Match) => {
      if (!m.id) m.id = `m${rows.length + 1}`;
      if (!rows.includes(m)) rows.push(m);
      return Promise.resolve(m);
    }),
  };
  const service = new MatchService(repo as never);
  return { service, rows };
}

describe("MatchService", () => {
  it("creates a canonical match once and returns the same one on repeat", async () => {
    const { service, rows } = makeService();
    const first = await service.createForPair("b", "a");
    expect([first.userAId, first.userBId]).toEqual(["a", "b"]);
    const second = await service.createForPair("a", "b");
    expect(second.id).toBe(first.id);
    expect(rows).toHaveLength(1);
  });

  it("rejects unmatch by a non-participant", async () => {
    const { service, rows } = makeService();
    rows.push({
      id: "m1",
      userAId: "a",
      userBId: "b",
      unmatchedAt: null,
      unmatchedBy: null,
      createdAt: new Date(),
    });
    await expect(service.unmatch("m1", "intruder")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("throws NotFound for an unknown match", async () => {
    const { service } = makeService();
    await expect(service.unmatch("nope", "a")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("marks a match unmatched by a participant", async () => {
    const { service, rows } = makeService();
    rows.push({
      id: "m1",
      userAId: "a",
      userBId: "b",
      unmatchedAt: null,
      unmatchedBy: null,
      createdAt: new Date(),
    });
    await service.unmatch("m1", "a");
    expect(rows[0].unmatchedAt).not.toBeNull();
    expect(rows[0].unmatchedBy).toBe("a");
  });
});
