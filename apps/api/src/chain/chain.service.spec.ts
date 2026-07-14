import type { Wallet } from "ethers";

import { ChainService } from "./chain.service";

function makeService(initialCount = 5): {
  service: ChainService;
  getTransactionCount: jest.Mock;
} {
  const service = new ChainService({ getOrThrow: jest.fn() } as never);
  const getTransactionCount = jest.fn().mockResolvedValue(initialCount);
  (service as unknown as { provider: unknown }).provider = { getTransactionCount };
  return { service, getTransactionCount };
}

const signer = { address: "0xAbCd" } as Wallet;

describe("ChainService.withSigner", () => {
  it("hands out sequential nonces starting from the on-chain count", async () => {
    const { service, getTransactionCount } = makeService(7);
    const nonces = await service.withSigner(signer, async (next) => [next(), next(), next()]);
    expect(nonces).toEqual([7, 8, 9]);
    expect(getTransactionCount).toHaveBeenCalledTimes(1);
  });

  it("continues the cached sequence across calls without re-querying the chain", async () => {
    const { service, getTransactionCount } = makeService(0);
    await service.withSigner(signer, async (next) => next()); // 0
    const second = await service.withSigner(signer, async (next) => next());
    expect(second).toBe(1);
    expect(getTransactionCount).toHaveBeenCalledTimes(1);
  });

  it("serializes concurrent batches for the same address", async () => {
    const { service } = makeService(0);
    const order: string[] = [];
    const slow = service.withSigner(signer, async (next) => {
      order.push("slow-start");
      await new Promise((r) => setTimeout(r, 20));
      const n = next();
      order.push("slow-end");
      return n;
    });
    const fast = service.withSigner(signer, async (next) => {
      order.push("fast");
      return next();
    });
    const [a, b] = await Promise.all([slow, fast]);
    expect(order).toEqual(["slow-start", "slow-end", "fast"]);
    expect([a, b]).toEqual([0, 1]);
  });

  it("re-syncs the nonce from chain after a failed batch", async () => {
    const { service, getTransactionCount } = makeService(3);
    await expect(
      service.withSigner(signer, async (next) => {
        next();
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    getTransactionCount.mockResolvedValue(4); // chain moved on
    const nonce = await service.withSigner(signer, async (next) => next());
    expect(nonce).toBe(4);
    expect(getTransactionCount).toHaveBeenCalledTimes(2);
  });

  it("tracks nonces independently per signer address", async () => {
    const { service, getTransactionCount } = makeService(0);
    getTransactionCount.mockImplementation((addr: string) =>
      Promise.resolve(addr === "0xAbCd" ? 10 : 20),
    );
    const other = { address: "0xEeFf" } as Wallet;
    const [a, b] = await Promise.all([
      service.withSigner(signer, async (next) => next()),
      service.withSigner(other, async (next) => next()),
    ]);
    expect(a).toBe(10);
    expect(b).toBe(20);
  });
});
