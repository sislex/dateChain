import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { formatUnits, parseUnits } from "ethers";
import { In, Repository } from "typeorm";

import { Setting } from "../admin/setting.entity";
import { AuditService } from "../audit/audit.service";
import { ChainService } from "../chain/chain.service";
import { NotificationType } from "../notifications/notification.entity";
import { NotificationService } from "../notifications/notification.service";
import { Profile } from "../profiles/profile.entity";
import { WalletService } from "../wallet/wallet.service";

import { Transfer } from "./transfer.entity";

const DEFAULT_TRANSFER_FEE_BPS = 200; // 2%
export const TRANSFER_FEE_KEY = "transfer_fee_bps";

export interface TransferView {
  id: string;
  direction: "out" | "in";
  amount: string;
  fee: string;
  net: string;
  counterpart: { userId: string; displayName: string | null };
  createdAt: Date;
}

@Injectable()
export class TransfersService {
  constructor(
    @InjectRepository(Transfer) private readonly transfers: Repository<Transfer>,
    @InjectRepository(Setting) private readonly settings: Repository<Setting>,
    @InjectRepository(Profile) private readonly profiles: Repository<Profile>,
    private readonly chain: ChainService,
    private readonly wallets: WalletService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  async getFeeBps(): Promise<number> {
    const row = await this.settings.findOne({ where: { key: TRANSFER_FEE_KEY } });
    const value = row ? Number(row.value) : DEFAULT_TRANSFER_FEE_BPS;
    return Number.isFinite(value) ? value : DEFAULT_TRANSFER_FEE_BPS;
  }

  /** Sends `amount` DATE from one user to another, taking the service commission. */
  async send(fromId: string, toId: string, amount: number): Promise<TransferView> {
    if (fromId === toId) throw new BadRequestException("Нельзя перевести самому себе");
    const feeBps = await this.getFeeBps();
    const amountBase = parseUnits(String(amount), 18);
    const feeBase = (amountBase * BigInt(feeBps)) / 10000n;
    const netBase = amountBase - feeBase;

    const signer = await this.wallets.signerFor(fromId);
    const toAddr = await this.wallets.addressOf(toId);
    const service = await this.chain.escrow().serviceWallet();

    const balance: bigint = await this.chain.token().balanceOf(signer.address);
    if (balance < amountBase) throw new BadRequestException("Недостаточно средств");

    let txHash = "";
    try {
      await this.chain.withSigner(signer, async (nextNonce) => {
        const tx = await this.chain.token(signer).transfer(toAddr, netBase, { nonce: nextNonce() });
        await tx.wait();
        txHash = tx.hash;
        if (feeBase > 0n) {
          await (
            await this.chain.token(signer).transfer(service, feeBase, { nonce: nextNonce() })
          ).wait();
        }
      });
    } catch (err) {
      const reason =
        (err as { shortMessage?: string; reason?: string }).reason ??
        (err as { shortMessage?: string }).shortMessage ??
        "Не удалось выполнить перевод";
      throw new BadRequestException(reason);
    }

    const transfer = await this.transfers.save(
      this.transfers.create({
        fromId,
        toId,
        amount: String(amount),
        fee: formatUnits(feeBase, 18),
        net: formatUnits(netBase, 18),
        feeBps,
        txHash,
      }),
    );
    await this.notifications.create(toId, NotificationType.TransferReceived, {
      fromUserId: fromId,
      amount: formatUnits(netBase, 18),
    });
    await this.audit.record(fromId, "transfer.send", { type: "transfer", id: transfer.id }, {
      toId,
      amount: String(amount),
      fee: formatUnits(feeBase, 18),
      feeBps,
    });
    return this.toViews([transfer], fromId)[0];
  }

  async list(userId: string): Promise<TransferView[]> {
    const rows = await this.transfers.find({
      where: [{ fromId: userId }, { toId: userId }],
      order: { createdAt: "DESC" },
    });
    return this.enrich(rows, userId);
  }

  private async enrich(rows: Transfer[], viewerId: string): Promise<TransferView[]> {
    if (rows.length === 0) return [];
    const others = rows.map((t) => (t.fromId === viewerId ? t.toId : t.fromId));
    const profiles = await this.profiles.find({ where: { userId: In(others) } });
    const nameByUser = new Map(profiles.map((p) => [p.userId, p.displayName]));
    return this.toViews(rows, viewerId).map((v) => ({
      ...v,
      counterpart: { ...v.counterpart, displayName: nameByUser.get(v.counterpart.userId) ?? null },
    }));
  }

  private toViews(rows: Transfer[], viewerId: string): TransferView[] {
    return rows.map((t) => {
      const outgoing = t.fromId === viewerId;
      return {
        id: t.id,
        direction: outgoing ? "out" : "in",
        amount: t.amount,
        fee: t.fee,
        net: t.net,
        counterpart: { userId: outgoing ? t.toId : t.fromId, displayName: null },
        createdAt: t.createdAt,
      };
    });
  }
}
