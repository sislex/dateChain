import { BadRequestException } from "@nestjs/common";

import { BlockService } from "./block.service";

function setup() {
  const blockRows: unknown[] = [];
  const blocks = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((p: object) => p),
    save: jest.fn((b: object) => {
      blockRows.push(b);
      return Promise.resolve({ id: "b1", ...b });
    }),
    find: jest.fn().mockResolvedValue([]),
  };
  const matches = { update: jest.fn().mockResolvedValue({}) };
  return { service: new BlockService(blocks as never, matches as never), blocks, matches };
}

describe("BlockService", () => {
  it("creates a block and unmatches the canonical pair", async () => {
    const { service, matches } = setup();
    await service.block("z", "a");
    expect(matches.update).toHaveBeenCalledWith(
      expect.objectContaining({ userAId: "a", userBId: "z" }),
      expect.objectContaining({ unmatchedBy: "z" }),
    );
  });

  it("rejects blocking yourself", async () => {
    const { service } = setup();
    await expect(service.block("u1", "u1")).rejects.toBeInstanceOf(BadRequestException);
  });
});
