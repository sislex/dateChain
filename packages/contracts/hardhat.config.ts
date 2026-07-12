import "@nomicfoundation/hardhat-toolbox";
import type { HardhatUserConfig } from "hardhat/config";

// RPC/chainId are env-driven so the same config points at a local Hardhat node
// now and a real network later without code changes.
const RPC_URL = process.env.CHAIN_RPC_URL ?? "http://127.0.0.1:8545";
const CHAIN_ID = Number(process.env.CHAIN_ID ?? 31337);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: RPC_URL, chainId: CHAIN_ID },
  },
};

export default config;
