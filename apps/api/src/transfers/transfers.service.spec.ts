import { BadRequestException } from "@nestjs/common";
import { parseUnits } from "ethers";

import { TransfersService } from "./transfers.service";

interface Mocks {
  transfers: { create: jest.Mock; save: jest.Mock; find: jest.Mock };
  profiles: { find: jest.Mock; findOne: jest.Mock };
  chain: Record<string, unknown>;
  wallets: { signerFor: jest.Mock; addressOf: jest.Mock };
  notifications: { create: jest.Mock };
  audit: { record: jest.Mock };
  token: { balanceOf: jest.Mock; approve: jest.Mock };
  escrow: { transferFeeBps: jest.Mock; payTransfer: jest.Mock };
}

function makeService(balance = parseUnits("100", 18)): { service: TransfersService; m: Mocks } {
  const token = {
    balanceOf: jest.fn().mockResolvedValue(balance),
    approve: jest.fn().mockResolvedValue({ wait: jest.fn() }),
  };
  const escrow = {
    transferFeeBps: jest.fn().mockResolvedValue(200n),
    payTransfer: jest.fn().mockResolvedValue({ hash: "0xtx", wait: jest.fn() }),
  };
  const chain = {
    available: true,
    token: jest.fn(() => token),
    escrow: jest.fn(() => escrow),
    escrowAddress: "0xEscrow",
    withSigner: jest.fn((_s: unknown, fn: (n: () => number) => Promise<unknown>) => {
      let n = 0;
      return fn(() => n++);
    }),
  };
  const m: Mocks = {
    transfers: {
      create: jest.fn((x: object) => x),
      save: jest.fn((x: object) =>
        Promise.resolve({ ...x, id: "t1", createdAt: new Date("2026-07-14T10:00:00Z") }),
      ),
      find: jest.fn().mockResolvedValue([]),
    },
    profiles: {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ displayName: "Анна" }),
    },
    chain,
    wallets: {
      signerFor: jest.fn().mockResolvedValue({ address: "0xFrom" }),
      addressOf: jest.fn().mockResolvedValue("0xTo"),
    },
    notifications: { create: jest.fn() },
    audit: { record: jest.fn() },
    token,
    escrow,
  };
  const service = new TransfersService(
    m.transfers as never,
    m.profiles as never,
    m.chain as never,
    m.wallets as never,
    m.notifications as never,
    m.audit as never,
  );
  return { service, m };
}

describe("TransfersService", () => {
  it("reads the transfer fee from the escrow contract", async () => {
    const { service } = makeService();
    await expect(service.getFeeBps()).resolves.toBe(200);
  });

  it("rejects sending to yourself", async () => {
    const { service } = makeService();
    await expect(service.send("u1", "u1", 10)).rejects.toThrow(BadRequestException);
  });

  it("rejects when the balance is insufficient", async () => {
    const { service, m } = makeService(parseUnits("5", 18));
    await expect(service.send("u1", "u2", 10)).rejects.toThrow("Недостаточно средств");
    expect(m.escrow.payTransfer).not.toHaveBeenCalled();
  });

  it("approves the escrow, pays on-chain and records the fee split", async () => {
    const { service, m } = makeService();
    const view = await service.send("u1", "u2", 100);

    expect(m.token.approve).toHaveBeenCalledWith(
      "0xEscrow",
      parseUnits("100", 18),
      expect.objectContaining({ nonce: 0 }),
    );
    expect(m.escrow.payTransfer).toHaveBeenCalledWith(
      "0xTo",
      parseUnits("100", 18),
      expect.objectContaining({ nonce: 1 }),
    );
    expect(view).toMatchObject({ direction: "out", amount: "100", fee: "2.0", net: "98.0" });
    expect(m.transfers.save).toHaveBeenCalledWith(
      expect.objectContaining({ fromId: "u1", toId: "u2", txHash: "0xtx", feeBps: 200 }),
    );
    expect(m.notifications.create).toHaveBeenCalledWith(
      "u2",
      expect.anything(),
      expect.objectContaining({ amount: "98.0" }),
    );
    expect(m.audit.record).toHaveBeenCalled();
  });

  it("translates an on-chain revert into a 400 with the revert reason", async () => {
    const { service, m } = makeService();
    m.escrow.payTransfer.mockRejectedValue({ reason: "self" });
    await expect(service.send("u1", "u2", 10)).rejects.toThrow("self");
  });

  it("lists transfers with directions and counterpart names", async () => {
    const { service, m } = makeService();
    m.transfers.find.mockResolvedValue([
      {
        id: "t1",
        fromId: "me",
        toId: "u2",
        amount: "50",
        fee: "1.0",
        net: "49.0",
        createdAt: new Date(),
      },
      {
        id: "t2",
        fromId: "u3",
        toId: "me",
        amount: "10",
        fee: "0.2",
        net: "9.8",
        createdAt: new Date(),
      },
    ]);
    m.profiles.find.mockResolvedValue([
      { userId: "u2", displayName: "Борис" },
      { userId: "u3", displayName: "Вера" },
    ]);

    const list = await service.list("me");
    expect(list[0]).toMatchObject({
      direction: "out",
      counterpart: { userId: "u2", displayName: "Борис" },
    });
    expect(list[1]).toMatchObject({
      direction: "in",
      counterpart: { userId: "u3", displayName: "Вера" },
    });
  });
});
