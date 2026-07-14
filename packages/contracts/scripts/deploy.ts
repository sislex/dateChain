import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { artifacts, ethers, network } from "hardhat";

/**
 * Deploys DateToken + DateEscrow to the target network, mints an initial treasury
 * supply, and writes deployments/<network>.json (addresses + ABIs) which the API
 * reads at boot. Idempotent enough for a fresh local node; re-run after restart.
 */
const FEE_BPS = Number(process.env.ESCROW_FEE_BPS ?? 2000); // 20%
const TRANSFER_FEE_BPS = Number(process.env.TRANSFER_FEE_BPS ?? 200); // 2%
const TREASURY_SUPPLY = ethers.parseUnits(process.env.TREASURY_SUPPLY ?? "1000000", 18);

const outFile = join(__dirname, "..", "deployments", `${network.name}.json`);

interface PriorDeployment {
  token: { address: string };
  escrow: { address: string };
  serviceWallet: string;
}

function readPrior(): PriorDeployment | null {
  if (process.env.FRESH_TOKEN === "true" || !existsSync(outFile)) return null;
  try {
    return JSON.parse(readFileSync(outFile, "utf8")) as PriorDeployment;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  const prior = readPrior();

  // Reuse the existing token (and its balances) when redeploying only the
  // escrow; deploy a fresh token otherwise (or with FRESH_TOKEN=true).
  // A prior address is only trusted if the contract still exists on-chain —
  // after a node restart the chain is empty and the file is stale.
  const priorTokenLive =
    prior !== null && (await ethers.provider.getCode(prior.token.address)) !== "0x";
  let tokenAddress: string;
  if (prior && priorTokenLive) {
    tokenAddress = prior.token.address;
    // eslint-disable-next-line no-console
    console.log(`Reusing token ${tokenAddress} (balances preserved)`);
  } else {
    if (prior) {
      // eslint-disable-next-line no-console
      console.log(`Prior token ${prior.token.address} has no code on this chain — deploying fresh`);
    }
    const Token = await ethers.getContractFactory("DateToken");
    const token = await Token.deploy(deployer.address);
    await token.waitForDeployment();
    tokenAddress = await token.getAddress();
    await (await token.mint(deployer.address, TREASURY_SUPPLY)).wait();
  }

  // Preserve the live service wallet from a prior escrow if present.
  let serviceWallet = process.env.SERVICE_WALLET_ADDRESS ?? deployer.address;
  if (prior && (await ethers.provider.getCode(prior.escrow.address)) !== "0x") {
    const priorEscrow = await ethers.getContractAt("DateEscrow", prior.escrow.address);
    try {
      serviceWallet = await priorEscrow.serviceWallet();
    } catch {
      /* prior escrow unreachable — keep default */
    }
  }

  const Escrow = await ethers.getContractFactory("DateEscrow");
  const escrow = await Escrow.deploy(
    deployer.address,
    tokenAddress,
    serviceWallet,
    FEE_BPS,
    TRANSFER_FEE_BPS,
  );
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();

  const tokenAbi = (await artifacts.readArtifact("DateToken")).abi;
  const escrowAbi = (await artifacts.readArtifact("DateEscrow")).abi;

  const out = {
    chainId: Number(network.config.chainId ?? 31337),
    network: network.name,
    treasury: deployer.address,
    serviceWallet,
    feeBps: FEE_BPS,
    transferFeeBps: TRANSFER_FEE_BPS,
    token: { address: tokenAddress, abi: tokenAbi },
    escrow: { address: escrowAddress, abi: escrowAbi },
  };

  const dir = join(__dirname, "..", "deployments");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${network.name}.json`);
  writeFileSync(file, JSON.stringify(out, null, 2));

  // eslint-disable-next-line no-console
  console.log(`Deployed:\n  token=${tokenAddress}\n  escrow=${escrowAddress}\n  service=${serviceWallet}\n  → ${file}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
