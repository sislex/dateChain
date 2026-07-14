import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

import { config as loadEnv } from "dotenv";
import { Contract, JsonRpcProvider, type InterfaceAbi } from "ethers";
import { DataSource } from "typeorm";

import { buildDataSourceOptions } from "../database/typeorm.config";

/**
 * Dev helper: after a chain reset, PROPOSED/ACCEPTED dates in the DB reference
 * escrows that no longer exist on-chain and can never be settled. This marks
 * them CANCELLED so they stop showing up as actionable.
 *
 * A date is stale when its on-chain escrow is missing (proposer = 0x0) or its
 * on-chain status no longer matches the DB one.
 *
 * Run: pnpm cleanup:dates   (from repo root)
 */
loadEnv({ path: [".env", "../../.env"] });

const STATUS_BY_DB = { PROPOSED: 1n, ACCEPTED: 2n } as const;

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
  ) as { escrow: { address: string; abi: InterfaceAbi } };
  const provider = new JsonRpcProvider(process.env.CHAIN_RPC_URL ?? "http://127.0.0.1:8545");
  const escrow = new Contract(dep.escrow.address, dep.escrow.abi, provider);

  const rows: Array<{ id: string; escrowId: string; status: "PROPOSED" | "ACCEPTED" }> =
    await ds.query(`SELECT id, "escrowId", status FROM dates WHERE status IN ('PROPOSED','ACCEPTED')`);

  let cancelled = 0;
  for (const row of rows) {
    const e = await escrow.escrows(row.escrowId);
    const missing = String(e.proposer) === "0x0000000000000000000000000000000000000000";
    const mismatched = !missing && e.status !== STATUS_BY_DB[row.status];
    if (missing || mismatched) {
      await ds.query(`UPDATE dates SET status = 'CANCELLED', "updatedAt" = now() WHERE id = $1`, [
        row.id,
      ]);
      cancelled += 1;
      // eslint-disable-next-line no-console
      console.log(`date ${row.id} (escrow #${row.escrowId}, ${row.status}) → CANCELLED`);
    }
  }

  await ds.destroy();
  // eslint-disable-next-line no-console
  console.log(`Done: ${cancelled} stale date(s) cancelled out of ${rows.length} active.`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
