import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { artifacts, ethers, network } from "hardhat";

/**
 * Deploys DateToken + DateEscrow to the target network, mints an initial treasury
 * supply, and writes deployments/<network>.json (addresses + ABIs) which the API
 * reads at boot. Idempotent enough for a fresh local node; re-run after restart.
 */
const FEE_BPS = Number(process.env.ESCROW_FEE_BPS ?? 2000); // 20%
const TREASURY_SUPPLY = ethers.parseUnits(process.env.TREASURY_SUPPLY ?? "1000000", 18);

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  // Deployer is the owner/treasury; also the initial service (commission) wallet.
  const serviceWallet = process.env.SERVICE_WALLET_ADDRESS ?? deployer.address;

  const Token = await ethers.getContractFactory("DateToken");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  const Escrow = await ethers.getContractFactory("DateEscrow");
  const escrow = await Escrow.deploy(deployer.address, tokenAddress, serviceWallet, FEE_BPS);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();

  await (await token.mint(deployer.address, TREASURY_SUPPLY)).wait();

  const tokenAbi = (await artifacts.readArtifact("DateToken")).abi;
  const escrowAbi = (await artifacts.readArtifact("DateEscrow")).abi;

  const out = {
    chainId: Number(network.config.chainId ?? 31337),
    network: network.name,
    treasury: deployer.address,
    serviceWallet,
    feeBps: FEE_BPS,
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
