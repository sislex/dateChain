import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import {
  EventLog,
  Wallet as EthWallet,
  formatUnits,
  parseEther,
  parseUnits,
  type Wallet as EthWalletType,
} from "ethers";
import { Repository } from "typeorm";

import { ChainService } from "../chain/chain.service";
import { decryptSecret, encryptSecret } from "../chain/crypto.util";

import { Wallet } from "./wallet.entity";

export interface WalletView {
  address: string;
  /** Human-readable DATE balance, e.g. "1000.0". */
  balance: string;
  /** Raw balance in base units (wei), as a string. */
  balanceRaw: string;
  symbol: string;
}

export interface WalletTx {
  hash: string;
  direction: "in" | "out";
  amount: string;
  counterparty: string;
  label: string;
  blockNumber: number;
}

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly wallets: Repository<Wallet>,
    private readonly chain: ChainService,
    private readonly config: ConfigService,
  ) {}

  private encKey(): string {
    return this.config.getOrThrow<string>("WALLET_ENC_KEY");
  }

  /** Returns the user's wallet, creating (and funding) it on first access. */
  async getOrProvision(userId: string): Promise<Wallet> {
    const existing = await this.wallets.findOne({ where: { userId } });
    if (existing) return existing;
    return this.provision(userId);
  }

  private async provision(userId: string): Promise<Wallet> {
    if (!this.chain.available) {
      throw new ServiceUnavailableException("Blockchain unavailable (run chain:deploy)");
    }
    const account = EthWallet.createRandom();
    const gasEth = this.config.get<string>("WALLET_GAS_ETH", "1");
    const seed = this.config.get<string>("WALLET_SEED_AMOUNT", "1000");

    // Fund gas (ETH) and seed DATE, serialized with managed nonces so
    // concurrent provisioning never reuses a treasury nonce.
    await this.chain.withTreasury(async (treasury, nextNonce) => {
      await (
        await treasury.sendTransaction({
          to: account.address,
          value: parseEther(gasEth),
          nonce: nextNonce(),
        })
      ).wait();
      await (
        await this.chain
          .token(treasury)
          .mint(account.address, parseUnits(seed, 18), { nonce: nextNonce() })
      ).wait();
    });

    const wallet = this.wallets.create({
      userId,
      address: account.address,
      privkeyEnc: encryptSecret(account.privateKey, this.encKey()),
    });
    return this.wallets.save(wallet);
  }

  /** Ethers signer for the user's custodial wallet (backend signs on their behalf). */
  async signerFor(userId: string): Promise<EthWalletType> {
    const wallet = await this.getOrProvision(userId);
    return this.chain.walletFrom(decryptSecret(wallet.privkeyEnc, this.encKey()));
  }

  async addressOf(userId: string): Promise<string> {
    return (await this.getOrProvision(userId)).address;
  }

  async getView(userId: string): Promise<WalletView> {
    const wallet = await this.getOrProvision(userId);
    const raw: bigint = await this.chain.token().balanceOf(wallet.address);
    return {
      address: wallet.address,
      balance: formatUnits(raw, 18),
      balanceRaw: raw.toString(),
      symbol: "DATE",
    };
  }

  /** The user's DATE token movements (on-chain Transfer events), newest first. */
  async transactions(userId: string): Promise<WalletTx[]> {
    const wallet = await this.getOrProvision(userId);
    const addr = wallet.address.toLowerCase();
    const token = this.chain.token();
    const [sent, received] = await Promise.all([
      token.queryFilter(token.filters.Transfer(wallet.address)),
      token.queryFilter(token.filters.Transfer(null, wallet.address)),
    ]);

    const escrow = this.chain.escrowAddress.toLowerCase();
    const service = (await this.chain.escrow().serviceWallet()).toLowerCase();
    const treasury = this.chain.treasuryAddress.toLowerCase();
    const label = (counterparty: string, outgoing: boolean): string => {
      if (counterparty === escrow) return outgoing ? "Заморозка в эскроу" : "Из эскроу (выплата/возврат)";
      if (counterparty === service) return "Комиссия сервиса";
      if (counterparty === treasury) return "Пополнение сервисом";
      return outgoing ? "Отправлено" : "Получено";
    };

    const seen = new Set<string>();
    const txs: WalletTx[] = [];
    for (const ev of [...sent, ...received]) {
      if (!(ev instanceof EventLog)) continue;
      const key = `${ev.transactionHash}:${ev.index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const from = String(ev.args.from).toLowerCase();
      const to = String(ev.args.to).toLowerCase();
      const outgoing = from === addr;
      const counterparty = outgoing ? to : from;
      txs.push({
        hash: ev.transactionHash,
        direction: outgoing ? "out" : "in",
        amount: formatUnits(ev.args.value as bigint, 18),
        counterparty,
        label: label(counterparty, outgoing),
        blockNumber: ev.blockNumber,
      });
    }
    txs.sort((a, b) => b.blockNumber - a.blockNumber);
    return txs;
  }
}
