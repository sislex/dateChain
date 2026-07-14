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
import { In, Repository } from "typeorm";

import { ChainService } from "../chain/chain.service";
import { decryptSecret, encryptSecret } from "../chain/crypto.util";
import { DateEntity, DateStatus } from "../dates/date.entity";
import { Profile } from "../profiles/profile.entity";
import { Transfer } from "../transfers/transfer.entity";

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

export type WalletHistoryType = "date" | "transfer" | "topup";

export interface WalletHistoryItem {
  id: string;
  type: WalletHistoryType;
  direction: "in" | "out";
  /** Amount credited/debited for the viewer (human DATE). */
  amount: string;
  /** Service commission attached to the operation (human DATE). */
  fee: string;
  counterpart: { userId: string | null; displayName: string | null };
  /** Date lifecycle status — only for type "date". */
  status: DateStatus | null;
  createdAt: string;
}

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly wallets: Repository<Wallet>,
    @InjectRepository(Transfer)
    private readonly transfers: Repository<Transfer>,
    @InjectRepository(DateEntity)
    private readonly dates: Repository<DateEntity>,
    @InjectRepository(Profile)
    private readonly profiles: Repository<Profile>,
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

  /**
   * Unified wallet history for the UI table: peer transfers and dates (with the
   * counterpart's name and the service commission) from the DB, plus on-chain
   * top-ups (mints / treasury funding). Newest first.
   */
  async history(userId: string): Promise<WalletHistoryItem[]> {
    const wallet = await this.getOrProvision(userId);
    const items: WalletHistoryItem[] = [];

    // ── Peer-to-peer transfers ─────────────────────────────────────────
    const transfers = await this.transfers.find({
      where: [{ fromId: userId }, { toId: userId }],
      order: { createdAt: "DESC" },
    });
    for (const t of transfers) {
      const outgoing = t.fromId === userId;
      items.push({
        id: `transfer:${t.id}`,
        type: "transfer",
        direction: outgoing ? "out" : "in",
        amount: outgoing ? t.amount : t.net,
        fee: t.fee,
        counterpart: { userId: outgoing ? t.toId : t.fromId, displayName: null },
        status: null,
        createdAt: t.createdAt.toISOString(),
      });
    }

    // ── Dates for tokens (escrow) ──────────────────────────────────────
    // Money moves at propose (proposer's tokens lock in escrow) and settles at
    // confirm (net to invitee, fee to service). Declined/cancelled-unfunded
    // proposals are fully refunded, so they are omitted.
    const feeBps = this.chain.available ? this.chain.feeBps : 0;
    const dates = await this.dates.find({
      where: [
        { proposerId: userId, status: In([DateStatus.Proposed, DateStatus.Accepted, DateStatus.Confirmed]) },
        { inviteeId: userId, status: DateStatus.Confirmed },
      ],
      order: { createdAt: "DESC" },
    });
    for (const d of dates) {
      const proposer = d.proposerId === userId;
      const amountBase = parseUnits(d.amount, 18);
      const feeBase = (amountBase * BigInt(feeBps)) / 10000n;
      const settled = d.status === DateStatus.Confirmed;
      items.push({
        id: `date:${d.id}`,
        type: "date",
        direction: proposer ? "out" : "in",
        amount: proposer ? d.amount : formatUnits(amountBase - feeBase, 18),
        fee: settled ? formatUnits(feeBase, 18) : "0",
        counterpart: { userId: proposer ? d.inviteeId : d.proposerId, displayName: null },
        status: d.status,
        createdAt: (settled ? d.updatedAt : d.createdAt).toISOString(),
      });
    }

    // ── Top-ups: on-chain mints and treasury funding to this wallet ────
    if (this.chain.available) {
      const token = this.chain.token();
      const received = await token.queryFilter(token.filters.Transfer(null, wallet.address));
      const treasury = this.chain.treasuryAddress.toLowerCase();
      const zero = "0x0000000000000000000000000000000000000000";
      const topups = received.filter((ev): ev is EventLog => {
        if (!(ev instanceof EventLog)) return false;
        const from = String(ev.args.from).toLowerCase();
        return from === zero || from === treasury;
      });
      const blockTs = new Map<number, number>();
      for (const ev of topups) {
        if (!blockTs.has(ev.blockNumber)) {
          const block = await this.chain.provider.getBlock(ev.blockNumber);
          blockTs.set(ev.blockNumber, (block?.timestamp ?? 0) * 1000);
        }
        items.push({
          id: `topup:${ev.transactionHash}:${ev.index}`,
          type: "topup",
          direction: "in",
          amount: formatUnits(ev.args.value as bigint, 18),
          fee: "0",
          counterpart: { userId: null, displayName: null },
          status: null,
          createdAt: new Date(blockTs.get(ev.blockNumber)!).toISOString(),
        });
      }
    }

    // Resolve counterpart names in one query.
    const otherIds = [
      ...new Set(items.map((i) => i.counterpart.userId).filter((v): v is string => v !== null)),
    ];
    if (otherIds.length > 0) {
      const profiles = await this.profiles.find({ where: { userId: In(otherIds) } });
      const nameByUser = new Map(profiles.map((p) => [p.userId, p.displayName]));
      for (const item of items) {
        if (item.counterpart.userId) {
          item.counterpart.displayName = nameByUser.get(item.counterpart.userId) ?? null;
        }
      }
    }

    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items;
  }
}
