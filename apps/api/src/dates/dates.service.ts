import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { parseUnits } from "ethers";
import { In, Repository } from "typeorm";

import { AuditService } from "../audit/audit.service";
import { ChainService } from "../chain/chain.service";
import { MatchService } from "../matching/match.service";
import { NotificationType } from "../notifications/notification.entity";
import { NotificationService } from "../notifications/notification.service";
import { Profile } from "../profiles/profile.entity";
import { Rating } from "../ratings/rating.entity";
import { WalletService } from "../wallet/wallet.service";

import { DateEntity, DateStatus } from "./date.entity";

export interface DateView {
  id: string;
  role: "proposer" | "invitee";
  status: DateStatus;
  amount: string;
  message: string | null;
  /** Planned date/time and place of the meeting (if the proposer set them). */
  scheduledAt: Date | null;
  location: string | null;
  counterpart: { userId: string; displayName: string | null };
  matchId: string | null;
  /** The score the viewer already gave for this date (null if not rated). */
  myRating: number | null;
  /** When the invitee may claim the payout if the proposer stays silent. */
  claimAvailableAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class DatesService {
  constructor(
    @InjectRepository(DateEntity) private readonly dates: Repository<DateEntity>,
    @InjectRepository(Profile) private readonly profiles: Repository<Profile>,
    @InjectRepository(Rating) private readonly ratings: Repository<Rating>,
    private readonly chain: ChainService,
    private readonly wallets: WalletService,
    private readonly matches: MatchService,
    private readonly notifications: NotificationService,
    private readonly audit: AuditService,
  ) {}

  /** Translates an on-chain revert into a 400 instead of a 500. */
  private async onChain<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const reason =
        (err as { shortMessage?: string; reason?: string }).reason ??
        (err as { shortMessage?: string }).shortMessage ??
        "Blockchain transaction failed";
      throw new BadRequestException(reason);
    }
  }

  /** Cached on-chain claim timeout (seconds); refreshed lazily. */
  private claimTimeoutCache: { value: number; fetchedAt: number } | null = null;

  private async getClaimTimeout(): Promise<number> {
    const TTL = 5 * 60_000;
    if (!this.claimTimeoutCache || Date.now() - this.claimTimeoutCache.fetchedAt > TTL) {
      const timeout: bigint = await this.chain.escrow().claimTimeout();
      this.claimTimeoutCache = { value: Number(timeout), fetchedAt: Date.now() };
    }
    return this.claimTimeoutCache.value;
  }

  async propose(
    proposerId: string,
    inviteeId: string,
    amount: number,
    message?: string,
    scheduledAt?: string,
    location?: string,
  ): Promise<DateView> {
    if (proposerId === inviteeId) throw new BadRequestException("Cannot invite yourself");
    const amountBase = parseUnits(String(amount), 18);

    const proposer = await this.wallets.signerFor(proposerId);
    const inviteeAddr = await this.wallets.addressOf(inviteeId);
    const balance: bigint = await this.chain.token().balanceOf(proposer.address);
    if (balance < amountBase) throw new BadRequestException("Insufficient DATE balance");

    const escrowAddr = await this.chain.escrow().getAddress();
    let escrowId = "";
    let proposeTx = "";
    await this.onChain(() =>
      this.chain.withSigner(proposer, async (nextNonce) => {
        await (
          await this.chain.token(proposer).approve(escrowAddr, amountBase, { nonce: nextNonce() })
        ).wait();
        const tx = await this.chain
          .escrow(proposer)
          .propose(inviteeAddr, amountBase, { nonce: nextNonce() });
        const receipt = await tx.wait();
        proposeTx = tx.hash;
        const iface = this.chain.escrow().interface;
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === "Proposed") {
              escrowId = parsed.args.id.toString();
              break;
            }
          } catch {
            /* not an escrow log */
          }
        }
      }),
    );

    const match = await this.matches.createForPair(proposerId, inviteeId);
    const date = await this.dates.save(
      this.dates.create({
        proposerId,
        inviteeId,
        matchId: match.id,
        amount: String(amount),
        escrowId,
        status: DateStatus.Proposed,
        message: message ?? null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        location: location?.trim() || null,
        proposeTx,
      }),
    );
    await this.notifications.create(inviteeId, NotificationType.DateProposed, {
      dateId: date.id,
      fromUserId: proposerId,
      amount: String(amount),
    });
    await this.audit.record(proposerId, "date.propose", { type: "date", id: date.id }, {
      inviteeId,
      amount: String(amount),
      escrowId,
    });
    return this.toView(date, proposerId);
  }

  async accept(dateId: string, userId: string): Promise<DateView> {
    const date = await this.requireInvitee(dateId, userId, DateStatus.Proposed);
    const signer = await this.wallets.signerFor(userId);
    await this.onChain(() =>
      this.chain.withSigner(signer, async (nextNonce) =>
        (await this.chain.escrow(signer).accept(date.escrowId, { nonce: nextNonce() })).wait(),
      ),
    );
    date.status = DateStatus.Accepted;
    date.acceptedAt = new Date();
    await this.dates.save(date);
    await this.notifications.create(date.proposerId, NotificationType.DateAccepted, {
      dateId,
      fromUserId: userId,
    });
    await this.audit.record(userId, "date.accept", { type: "date", id: dateId }, {
      amount: date.amount,
    });
    return this.toView(date, userId);
  }

  async decline(dateId: string, userId: string): Promise<DateView> {
    const date = await this.requireInvitee(dateId, userId, DateStatus.Proposed);
    const signer = await this.wallets.signerFor(userId);
    await this.onChain(() =>
      this.chain.withSigner(signer, async (nextNonce) =>
        (await this.chain.escrow(signer).decline(date.escrowId, { nonce: nextNonce() })).wait(),
      ),
    );
    date.status = DateStatus.Declined;
    await this.dates.save(date);
    await this.notifications.create(date.proposerId, NotificationType.DateDeclined, {
      dateId,
      fromUserId: userId,
    });
    await this.audit.record(userId, "date.decline", { type: "date", id: dateId });
    return this.toView(date, userId);
  }

  async confirm(dateId: string, userId: string): Promise<DateView> {
    const date = await this.requireProposer(dateId, userId, [DateStatus.Accepted]);
    const signer = await this.wallets.signerFor(userId);
    let settleTx = "";
    await this.onChain(() =>
      this.chain.withSigner(signer, async (nextNonce) => {
        const tx = await this.chain.escrow(signer).confirm(date.escrowId, { nonce: nextNonce() });
        await tx.wait();
        settleTx = tx.hash;
      }),
    );
    date.status = DateStatus.Confirmed;
    date.settleTx = settleTx;
    await this.dates.save(date);
    await this.notifications.create(date.inviteeId, NotificationType.DateConfirmed, {
      dateId,
      fromUserId: userId,
    });
    await this.audit.record(userId, "date.confirm", { type: "date", id: dateId }, {
      amount: date.amount,
      settleTx,
    });
    return this.toView(date, userId);
  }

  async cancel(dateId: string, userId: string): Promise<DateView> {
    const date = await this.requireProposer(dateId, userId, [
      DateStatus.Proposed,
      DateStatus.Accepted,
    ]);
    const wasFunded = date.status === DateStatus.Accepted; // penalty applies only if funded
    const signer = await this.wallets.signerFor(userId);
    let settleTx = "";
    await this.onChain(() =>
      this.chain.withSigner(signer, async (nextNonce) => {
        const tx = await this.chain.escrow(signer).cancel(date.escrowId, { nonce: nextNonce() });
        await tx.wait();
        settleTx = tx.hash;
      }),
    );
    date.status = DateStatus.Cancelled;
    date.settleTx = settleTx;
    await this.dates.save(date);
    await this.notifications.create(date.inviteeId, NotificationType.DateCancelled, {
      dateId,
      fromUserId: userId,
    });
    await this.audit.record(userId, "date.cancel", { type: "date", id: dateId }, {
      amount: date.amount,
      penalty: wasFunded,
      settleTx,
    });
    return this.toView(date, userId);
  }

  /** Invitee backs out after accepting: the proposer is refunded in full, no fee. */
  async refuse(dateId: string, userId: string): Promise<DateView> {
    const date = await this.requireInvitee(dateId, userId, DateStatus.Accepted);
    const signer = await this.wallets.signerFor(userId);
    let settleTx = "";
    await this.onChain(() =>
      this.chain.withSigner(signer, async (nextNonce) => {
        const tx = await this.chain
          .escrow(signer)
          .cancelByPayee(date.escrowId, { nonce: nextNonce() });
        await tx.wait();
        settleTx = tx.hash;
      }),
    );
    date.status = DateStatus.Declined;
    date.settleTx = settleTx;
    await this.dates.save(date);
    await this.notifications.create(date.proposerId, NotificationType.DateDeclined, {
      dateId,
      fromUserId: userId,
    });
    await this.audit.record(userId, "date.refuse", { type: "date", id: dateId }, {
      amount: date.amount,
      settleTx,
    });
    return this.toView(date, userId);
  }

  /**
   * Invitee claims the payout when the proposer neither confirmed nor cancelled
   * within the on-chain claim timeout. Same split as confirm (80/20).
   */
  async claim(dateId: string, userId: string): Promise<DateView> {
    const date = await this.requireInvitee(dateId, userId, DateStatus.Accepted);
    const signer = await this.wallets.signerFor(userId);
    let settleTx = "";
    await this.onChain(() =>
      this.chain.withSigner(signer, async (nextNonce) => {
        const tx = await this.chain.escrow(signer).claim(date.escrowId, { nonce: nextNonce() });
        await tx.wait();
        settleTx = tx.hash;
      }),
    );
    date.status = DateStatus.Confirmed;
    date.settleTx = settleTx;
    await this.dates.save(date);
    await this.notifications.create(date.proposerId, NotificationType.DateConfirmed, {
      dateId,
      fromUserId: userId,
    });
    await this.audit.record(userId, "date.claim", { type: "date", id: dateId }, {
      amount: date.amount,
      settleTx,
    });
    return this.toView(date, userId);
  }

  /** Dates the user is part of (proposer or invitee), newest first. */
  async list(userId: string): Promise<DateView[]> {
    const rows = await this.dates.find({
      where: [{ proposerId: userId }, { inviteeId: userId }],
      order: { createdAt: "DESC" },
    });
    return this.toViews(rows, userId);
  }

  // ── helpers ──────────────────────────────────────────────────────────
  private async requireInvitee(
    dateId: string,
    userId: string,
    status: DateStatus,
  ): Promise<DateEntity> {
    const date = await this.getOwned(dateId, userId);
    if (date.inviteeId !== userId) throw new ForbiddenException("Only the invitee can do this");
    if (date.status !== status) throw new ConflictException(`Date is ${date.status}`);
    return date;
  }

  private async requireProposer(
    dateId: string,
    userId: string,
    statuses: DateStatus[],
  ): Promise<DateEntity> {
    const date = await this.getOwned(dateId, userId);
    if (date.proposerId !== userId) throw new ForbiddenException("Only the proposer can do this");
    if (!statuses.includes(date.status)) throw new ConflictException(`Date is ${date.status}`);
    return date;
  }

  private async getOwned(dateId: string, userId: string): Promise<DateEntity> {
    const date = await this.dates.findOne({ where: { id: dateId } });
    if (!date) throw new NotFoundException("Date not found");
    if (date.proposerId !== userId && date.inviteeId !== userId) {
      throw new ForbiddenException("Not a participant");
    }
    return date;
  }

  private async toView(date: DateEntity, viewerId: string): Promise<DateView> {
    return (await this.toViews([date], viewerId))[0];
  }

  private async toViews(rows: DateEntity[], viewerId: string): Promise<DateView[]> {
    if (rows.length === 0) return [];
    const counterpartIds = rows.map((d) => (d.proposerId === viewerId ? d.inviteeId : d.proposerId));
    const profiles = await this.profiles.find({ where: { userId: In(counterpartIds) } });
    const nameByUser = new Map(profiles.map((p) => [p.userId, p.displayName]));

    const myRatings = await this.ratings.find({
      where: { dateId: In(rows.map((d) => d.id)), raterId: viewerId },
    });
    const scoreByDate = new Map(myRatings.map((r) => [r.dateId, r.score]));

    let claimTimeoutSec: number | null = null;
    if (rows.some((d) => d.status === DateStatus.Accepted && d.acceptedAt)) {
      try {
        claimTimeoutSec = await this.getClaimTimeout();
      } catch {
        /* chain unavailable — omit claimAvailableAt */
      }
    }

    return rows.map((d) => {
      const isProposer = d.proposerId === viewerId;
      const counterpartId = isProposer ? d.inviteeId : d.proposerId;
      const claimAvailableAt =
        d.status === DateStatus.Accepted && d.acceptedAt && claimTimeoutSec !== null
          ? new Date(d.acceptedAt.getTime() + claimTimeoutSec * 1000)
          : null;
      return {
        id: d.id,
        role: isProposer ? "proposer" : "invitee",
        status: d.status,
        amount: d.amount,
        message: d.message,
        scheduledAt: d.scheduledAt,
        location: d.location,
        counterpart: { userId: counterpartId, displayName: nameByUser.get(counterpartId) ?? null },
        matchId: d.matchId,
        myRating: scoreByDate.get(d.id) ?? null,
        claimAvailableAt,
        createdAt: d.createdAt,
      };
    });
  }
}
