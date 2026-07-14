import { ServiceUnavailableException } from "@nestjs/common";
import { parseUnits } from "ethers";

import { DateStatus } from "../dates/date.entity";

import { WalletService } from "./wallet.service";

function makeService(opts: { chainAvailable?: boolean } = {}) {
  const token = {
    balanceOf: jest.fn().mockResolvedValue(parseUnits("980", 18)),
    mint: jest.fn().mockResolvedValue({ wait: jest.fn() }),
    queryFilter: jest.fn().mockResolvedValue([]),
    filters: { Transfer: jest.fn() },
  };
  const chain = {
    available: opts.chainAvailable ?? true,
    feeBps: 2000,
    treasuryAddress: "0xTreasury",
    token: jest.fn(() => token),
    withTreasury: jest.fn((fn: (t: unknown, n: () => number) => Promise<unknown>) => {
      let n = 0;
      return fn({ sendTransaction: jest.fn().mockResolvedValue({ wait: jest.fn() }) }, () => n++);
    }),
    provider: { getBlock: jest.fn().mockResolvedValue({ timestamp: 1_700_000_000 }) },
  };
  const wallets = {
    findOne: jest.fn().mockResolvedValue({ userId: "me", address: "0xMyWallet" }),
    create: jest.fn((x: object) => x),
    save: jest.fn((x: object) => Promise.resolve(x)),
  };
  const transfers = { find: jest.fn().mockResolvedValue([]) };
  const dates = { find: jest.fn().mockResolvedValue([]) };
  const profiles = { find: jest.fn().mockResolvedValue([]) };
  const service = new WalletService(
    wallets as never,
    transfers as never,
    dates as never,
    profiles as never,
    chain as never,
    { getOrThrow: jest.fn(), get: jest.fn((_k: string, d: unknown) => d) } as never,
  );
  return { service, token, chain, wallets, transfers, dates, profiles };
}

describe("WalletService", () => {
  it("getView returns the on-chain balance for the user's wallet", async () => {
    const { service, token } = makeService();
    const view = await service.getView("me");
    expect(token.balanceOf).toHaveBeenCalledWith("0xMyWallet");
    expect(view).toMatchObject({ address: "0xMyWallet", balance: "980.0", symbol: "DATE" });
  });

  describe("topUp", () => {
    it("mints the amount from the treasury to the user's wallet", async () => {
      const { service, token } = makeService();
      await service.topUp("me", 100);
      expect(token.mint).toHaveBeenCalledWith(
        "0xMyWallet",
        parseUnits("100", 18),
        expect.anything(),
      );
    });

    it("fails with 503 when the chain is unavailable", async () => {
      const { service } = makeService({ chainAvailable: false });
      await expect(service.topUp("me", 100)).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe("history", () => {
    it("maps outgoing and incoming transfers with fee and tx hash", async () => {
      const { service, transfers, profiles } = makeService();
      transfers.find.mockResolvedValue([
        {
          id: "t1",
          fromId: "me",
          toId: "u2",
          amount: "50",
          fee: "1.0",
          net: "49.0",
          txHash: "0xt1",
          createdAt: new Date("2026-07-14T12:00:00Z"),
        },
        {
          id: "t2",
          fromId: "u2",
          toId: "me",
          amount: "10",
          fee: "0.2",
          net: "9.8",
          txHash: "0xt2",
          createdAt: new Date("2026-07-14T11:00:00Z"),
        },
      ]);
      profiles.find.mockResolvedValue([{ userId: "u2", displayName: "Борис" }]);

      const items = await service.history("me");
      expect(items[0]).toMatchObject({
        type: "transfer",
        direction: "out",
        amount: "50",
        fee: "1.0",
        txHash: "0xt1",
        counterpart: { userId: "u2", displayName: "Борис" },
      });
      expect(items[1]).toMatchObject({ direction: "in", amount: "9.8" });
    });

    it("shows a funded cancellation as a penalty-only debit", async () => {
      const { service, dates } = makeService();
      dates.find.mockResolvedValue([
        {
          id: "d1",
          proposerId: "me",
          inviteeId: "u2",
          amount: "50",
          status: DateStatus.Cancelled,
          acceptedAt: new Date("2026-07-13T00:00:00Z"),
          settleTx: "0xcancel",
          proposeTx: "0xprop",
          createdAt: new Date("2026-07-12T00:00:00Z"),
          updatedAt: new Date("2026-07-13T01:00:00Z"),
        },
      ]);
      const [item] = await service.history("me");
      expect(item).toMatchObject({
        type: "date",
        direction: "out",
        amount: "10.0", // 20% penalty of 50
        fee: "10.0",
        status: DateStatus.Cancelled,
        txHash: "0xcancel",
      });
    });

    it("omits cancellations that were never funded (no money moved)", async () => {
      const { service, dates } = makeService();
      dates.find.mockResolvedValue([
        {
          id: "d1",
          proposerId: "me",
          inviteeId: "u2",
          amount: "50",
          status: DateStatus.Cancelled,
          acceptedAt: null,
          settleTx: "0xcancel",
          proposeTx: "0xprop",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      await expect(service.history("me")).resolves.toEqual([]);
    });

    it("credits the invitee with amount minus fee on a confirmed date", async () => {
      const { service, dates } = makeService();
      dates.find.mockResolvedValue([
        {
          id: "d1",
          proposerId: "u2",
          inviteeId: "me",
          amount: "50",
          status: DateStatus.Confirmed,
          acceptedAt: new Date("2026-07-13T00:00:00Z"),
          settleTx: "0xconfirm",
          proposeTx: "0xprop",
          createdAt: new Date("2026-07-12T00:00:00Z"),
          updatedAt: new Date("2026-07-13T02:00:00Z"),
        },
      ]);
      const [item] = await service.history("me");
      expect(item).toMatchObject({
        direction: "in",
        amount: "40.0",
        fee: "10.0",
        txHash: "0xconfirm",
      });
    });

    it("sorts everything newest-first across sources", async () => {
      const { service, transfers, dates } = makeService();
      transfers.find.mockResolvedValue([
        {
          id: "t1",
          fromId: "me",
          toId: "u2",
          amount: "5",
          fee: "0.1",
          net: "4.9",
          txHash: null,
          createdAt: new Date("2026-07-10T00:00:00Z"),
        },
      ]);
      dates.find.mockResolvedValue([
        {
          id: "d1",
          proposerId: "me",
          inviteeId: "u2",
          amount: "50",
          status: DateStatus.Accepted,
          acceptedAt: new Date("2026-07-12T00:00:00Z"),
          settleTx: null,
          proposeTx: "0xprop",
          createdAt: new Date("2026-07-11T00:00:00Z"),
          updatedAt: new Date("2026-07-12T00:00:00Z"),
        },
      ]);
      const items = await service.history("me");
      expect(items.map((i) => i.type)).toEqual(["date", "transfer"]);
      // A frozen (accepted) date is timed by acceptance and carries no fee yet.
      expect(items[0]).toMatchObject({ fee: "0", status: DateStatus.Accepted });
    });
  });
});
