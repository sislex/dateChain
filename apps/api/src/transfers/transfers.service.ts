import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { formatUnits, parseUnits } from "ethers";
import { In, Repository } from "typeorm";

import { AuditService } from "../audit/audit.service";
import { ChainService } from "../chain/chain.service";
import { NotificationType } from "../notifications/notification.entity";
import { NotificationService } from "../notifications/notification.service";
import { Profile } from "../profiles/profile.entity";
import { WalletService } from "../wallet/wallet.service";

import { Transfer } from "./transfer.entity";

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
    @InjectRepository(Profile) private readonly profiles: Repository<Profile>,
    private readonly chain: ChainService,
    private readonly wallets: WalletService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  /** Transfer commission (bps) — read from the escrow contract. */
  async getFeeBps(): Promise<number> {
    if (!this.chain.available) {
      throw new ServiceUnavailableException("Blockchain unavailable (run chain:deploy)");
    }
    const bps: bigint = await this.chain.escrow().transferFeeBps();
    return Number(bps);
  }

  /**
   * Sends `amount` DATE from one user to another. The split is enforced on-chain
   * by DateEscrow.payTransfer: the sender approves the escrow, which pays the
   * recipient (amount - fee) and the service (fee) atomically.
   */
  async send(fromId: string, toId: string, amount: number): Promise<TransferView> {
    if (fromId === toId) throw new BadRequestException("Нельзя перевести самому себе");
    const feeBps = await this.getFeeBps();
    const amountBase = parseUnits(String(amount), 18);
    const feeBase = (amountBase * BigInt(feeBps)) / 10000n;
    const netBase = amountBase - feeBase;

    const signer = await this.wallets.signerFor(fromId);
    const toAddr = await this.wallets.addressOf(toId);
    const escrowAddr = this.chain.escrowAddress;

    const balance: bigint = await this.chain.token().balanceOf(signer.address);
    if (balance < amountBase) throw new BadRequestException("Недостаточно средств");

    let txHash = "";
    try {
      await this.chain.withSigner(signer, async (nextNonce) => {
        await (
          await this.chain.token(signer).approve(escrowAddr, amountBase, { nonce: nextNonce() })
        ).wait();
        const tx = await this.chain
          .escrow(signer)
          .payTransfer(toAddr, amountBase, { nonce: nextNonce() });
        await tx.wait();
        txHash = tx.hash;
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
    const fromProfile = await this.profiles.findOne({ where: { userId: fromId } });
    await this.notifications.create(toId, NotificationType.TransferReceived, {
      fromUserId: fromId,
      fromName: fromProfile?.displayName ?? null,
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
