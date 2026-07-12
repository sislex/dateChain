import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Contract, JsonRpcProvider, Wallet, type InterfaceAbi } from "ethers";

interface Deployment {
  chainId: number;
  treasury: string;
  serviceWallet: string;
  feeBps: number;
  token: { address: string; abi: InterfaceAbi };
  escrow: { address: string; abi: InterfaceAbi };
}

/**
 * Owns the ethers provider and contract metadata. Read calls use the provider;
 * write calls are signed with a per-user custodial Wallet (see WalletService) or
 * the treasury. Resilient: if the deployment file is missing the API still boots,
 * and crypto endpoints report the chain as unavailable.
 */
@Injectable()
export class ChainService implements OnModuleInit {
  private readonly logger = new Logger(ChainService.name);
  private deployment: Deployment | null = null;
  provider!: JsonRpcProvider;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.provider = new JsonRpcProvider(this.config.getOrThrow<string>("CHAIN_RPC_URL"));
    const rel = this.config.getOrThrow<string>("CONTRACTS_DEPLOYMENTS");
    const path = isAbsolute(rel) ? rel : resolve(process.cwd(), rel);
    try {
      this.deployment = JSON.parse(readFileSync(path, "utf8")) as Deployment;
      this.logger.log(
        `Chain ready: token=${this.deployment.token.address} escrow=${this.deployment.escrow.address}`,
      );
    } catch {
      this.logger.warn(`No deployment at ${path} — crypto features disabled until chain:deploy`);
    }
  }

  get available(): boolean {
    return this.deployment !== null;
  }

  private get dep(): Deployment {
    if (!this.deployment) throw new Error("Blockchain not deployed (run chain:deploy)");
    return this.deployment;
  }

  get serviceWallet(): string {
    return this.dep.serviceWallet;
  }

  get feeBps(): number {
    return this.dep.feeBps;
  }

  /** Treasury signer (contract owner) — mints tokens and funds custodial wallets. */
  treasurySigner(): Wallet {
    return new Wallet(this.config.getOrThrow<string>("TREASURY_PRIVKEY"), this.provider);
  }

  // ── Treasury tx serialization ──────────────────────────────────────────
  // The provider's "latest" count lags under automining, so we keep an
  // in-memory nonce and serialize all treasury txs through withTreasury().
  private treasuryLock: Promise<unknown> = Promise.resolve();
  private treasuryNonce: number | null = null;

  async withTreasury<T>(
    fn: (treasury: Wallet, nextNonce: () => number) => Promise<T>,
  ): Promise<T> {
    const task = this.treasuryLock.then(async () => {
      const treasury = this.treasurySigner();
      if (this.treasuryNonce === null) {
        this.treasuryNonce = await this.provider.getTransactionCount(treasury.address, "latest");
      }
      const nextNonce = (): number => this.treasuryNonce!++;
      try {
        return await fn(treasury, nextNonce);
      } catch (err) {
        this.treasuryNonce = null; // resync from chain on next use
        throw err;
      }
    });
    this.treasuryLock = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }

  walletFrom(privateKey: string): Wallet {
    return new Wallet(privateKey, this.provider);
  }

  /** DateToken contract bound to a signer (write) or the provider (read). */
  token(signer?: Wallet): Contract {
    return new Contract(this.dep.token.address, this.dep.token.abi, signer ?? this.provider);
  }

  /** DateEscrow contract bound to a signer (write) or the provider (read). */
  escrow(signer?: Wallet): Contract {
    return new Contract(this.dep.escrow.address, this.dep.escrow.abi, signer ?? this.provider);
  }
}
