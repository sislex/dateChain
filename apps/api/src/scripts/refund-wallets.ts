import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

import { config as loadEnv } from "dotenv";
import { Contract, JsonRpcProvider, Wallet, formatUnits, parseEther, parseUnits, type InterfaceAbi } from "ethers";
import { DataSource } from "typeorm";

import { buildDataSourceOptions } from "../database/typeorm.config";

/**
 * Dev helper: after a chain reset every custodial wallet in the DB has 0 ETH
 * (gas) and 0 DATE on the fresh chain. This re-funds them from the treasury,
 * idempotently: gas is topped up to 1 ETH when below 0.5, and 1000 DATE are
 * minted only when the DATE balance is exactly zero.
 *
 * Run: pnpm chain:refund   (from repo root; the chain and deployments must exist)
 */
loadEnv({ path: [".env", "../../.env"] });

const GAS_TARGET = parseEther("1");
const GAS_MIN = parseEther("0.5");
const SEED = parseUnits("1000", 18);

async function main(): Promise<void> {
  const ds = new DataSource(
    buildDataSourceOptions({
      POSTGRES_HOST: process.env.POSTGRES_HOST ?? "localhost",
      POSTGRES_PORT: Number(process.env.POSTGRES_PORT ?? 5432),
      POSTGRES_USER: process.env.POSTGRES_USER ?? "datechain",
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ?? "datechain",
      POSTGRES_DB: process.env.POSTGRES_DB ?? "datechain",
    }),
  );
  await ds.initialize();

  const depPath = process.env.CONTRACTS_DEPLOYMENTS ?? "packages/contracts/deployments/localhost.json";
  const dep = JSON.parse(
    readFileSync(isAbsolute(depPath) ? depPath : resolve(process.cwd(), "../..", depPath), "utf8"),
  ) as { token: { address: string; abi: InterfaceAbi } };
  const provider = new JsonRpcProvider(process.env.CHAIN_RPC_URL ?? "http://127.0.0.1:8545");
  // Same default as env.validation.ts — the well-known Hardhat dev account #0.
  const treasuryKey =
    process.env.TREASURY_PRIVKEY ??
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const treasury = new Wallet(treasuryKey, provider);
  const token = new Contract(dep.token.address, dep.token.abi, treasury);

  const rows: Array<{ address: string }> = await ds.query(`SELECT address FROM wallets`);
  // Manual nonce management: the node's reported count can lag under automining.
  let nonce = await provider.getTransactionCount(treasury.address, "latest");
  let funded = 0;
  for (const { address } of rows) {
    const [gas, date]: [bigint, bigint] = await Promise.all([
      provider.getBalance(address),
      token.balanceOf(address),
    ]);
    let touched = false;
    if (gas < GAS_MIN) {
      await (
        await treasury.sendTransaction({ to: address, value: GAS_TARGET - gas, nonce: nonce++ })
      ).wait();
      touched = true;
    }
    if (date === 0n) {
      await (await token.mint(address, SEED, { nonce: nonce++ })).wait();
      touched = true;
    }
    if (touched) {
      funded += 1;
      const newDate: bigint = await token.balanceOf(address);
      // eslint-disable-next-line no-console
      console.log(`${address}: gas topped up, ${formatUnits(newDate, 18)} DATE`);
    }
  }

  await ds.destroy();
  // eslint-disable-next-line no-console
  console.log(`Done: ${funded} of ${rows.length} wallet(s) refunded.`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
