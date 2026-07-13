import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { formatUnits } from "ethers";
import { Repository } from "typeorm";

import { TokenService, type TokenPair } from "../auth/token.service";
import { ChainService } from "../chain/chain.service";
import { Message } from "../chat/message.entity";
import { Match } from "../matching/match.entity";
import { Swipe } from "../matching/swipe.entity";
import { Report, ReportStatus } from "../moderation/report.entity";
import { ReportService } from "../moderation/report.service";
import { User, UserStatus } from "../users/user.entity";

import { AuditLog } from "./audit-log.entity";
import { Setting } from "./setting.entity";

export interface AdminMetrics {
  totalUsers: number;
  bannedUsers: number;
  totalMatches: number;
  totalMessages: number;
  totalSwipes: number;
  openReports: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AuditLog) private readonly audits: Repository<AuditLog>,
    @InjectRepository(Setting) private readonly settings: Repository<Setting>,
    @InjectRepository(Match) private readonly matches: Repository<Match>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    @InjectRepository(Swipe) private readonly swipes: Repository<Swipe>,
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    private readonly tokens: TokenService,
    private readonly reportService: ReportService,
    private readonly chain: ChainService,
  ) {}

  /** Service (commission) wallet: on-chain address, its DATE balance, and fee. */
  async getServiceWallet(): Promise<{ address: string; balance: string; feeBps: number }> {
    // Read live values from the escrow contract (not the deploy-time snapshot).
    const escrow = this.chain.escrow();
    const address: string = await escrow.serviceWallet();
    const feeBps: bigint = await escrow.feeBps();
    const raw: bigint = await this.chain.token().balanceOf(address);
    return { address, balance: formatUnits(raw, 18), feeBps: Number(feeBps) };
  }

  /** Point the escrow's commission wallet at a new address (owner-signed on-chain). */
  async setServiceWallet(
    actorId: string,
    address: string,
  ): Promise<{ address: string; balance: string; feeBps: number }> {
    await this.chain.withTreasury(async (treasury, nextNonce) => {
      await (
        await this.chain.escrow(treasury).setServiceWallet(address, { nonce: nextNonce() })
      ).wait();
    });
    await this.audit(actorId, "service_wallet.update", undefined, { address });
    return this.getServiceWallet();
  }

  async audit(
    actorId: string,
    action: string,
    target?: { type: string; id: string },
    meta: Record<string, unknown> = {},
  ): Promise<void> {
    await this.audits.save(
      this.audits.create({
        actorId,
        action,
        targetType: target?.type ?? null,
        targetId: target?.id ?? null,
        meta,
      }),
    );
  }

  listAudit(limit = 50): Promise<AuditLog[]> {
    return this.audits.find({ order: { createdAt: "DESC" }, take: Math.min(limit, 200) });
  }

  reportQueue(limit = 50): Promise<Report[]> {
    return this.reportService.listQueue(limit);
  }

  async metrics(): Promise<AdminMetrics> {
    const [totalUsers, bannedUsers, totalMatches, totalMessages, totalSwipes, openReports] =
      await Promise.all([
        this.users.count(),
        this.users.count({ where: { status: UserStatus.Banned } }),
        this.matches.count(),
        this.messages.count(),
        this.swipes.count(),
        this.reports.count({ where: { status: ReportStatus.Open } }),
      ]);
    return { totalUsers, bannedUsers, totalMatches, totalMessages, totalSwipes, openReports };
  }

  async listUsers(opts: {
    status?: UserStatus;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: User[]; total: number }> {
    const qb = this.users.createQueryBuilder("u");
    if (opts.status) qb.andWhere("u.status = :status", { status: opts.status });
    if (opts.q) qb.andWhere("(u.email ILIKE :q OR u.phone ILIKE :q)", { q: `%${opts.q}%` });
    qb.orderBy("u.createdAt", "DESC")
      .take(Math.min(opts.limit ?? 25, 100))
      .skip(opts.offset ?? 0);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getUser(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async setStatus(actorId: string, userId: string, status: UserStatus): Promise<User> {
    const user = await this.getUser(userId);
    user.status = status;
    await this.users.save(user);
    if (status === UserStatus.Banned) await this.tokens.revokeAllForUser(userId);
    await this.audit(actorId, "user.status", { type: "user", id: userId }, { status });
    return user;
  }

  async impersonate(
    actorId: string,
    userId: string,
  ): Promise<{ user: Pick<User, "id" | "role">; tokens: TokenPair }> {
    const user = await this.getUser(userId);
    const tokens = await this.tokens.issueTokenPair(user);
    await this.audit(actorId, "user.impersonate", { type: "user", id: userId });
    return { user: { id: user.id, role: user.role }, tokens };
  }

  async resolveReport(
    actorId: string,
    reportId: string,
    status: ReportStatus.Resolved | ReportStatus.Dismissed,
    resolution?: string,
    banReported?: boolean,
  ): Promise<Report> {
    const report = await this.reportService.resolve(reportId, actorId, status, resolution);
    if (banReported) await this.setStatus(actorId, report.reportedId, UserStatus.Banned);
    await this.audit(actorId, "report.resolve", { type: "report", id: reportId }, { status });
    return report;
  }

  getSettings(): Promise<Setting[]> {
    return this.settings.find();
  }

  /** Peer-to-peer transfer commission (bps), enforced on-chain by the escrow. */
  async getTransferFee(): Promise<{ feeBps: number }> {
    const bps: bigint = await this.chain.escrow().transferFeeBps();
    return { feeBps: Number(bps) };
  }

  async setTransferFee(actorId: string, feeBps: number): Promise<{ feeBps: number }> {
    await this.chain.withTreasury(async (treasury, nextNonce) => {
      await (
        await this.chain.escrow(treasury).setTransferFeeBps(feeBps, { nonce: nextNonce() })
      ).wait();
    });
    await this.audit(actorId, "transfer_fee.update", undefined, { feeBps });
    return this.getTransferFee();
  }

  async setSetting(actorId: string, key: string, value: unknown): Promise<Setting> {
    await this.settings.save(this.settings.create({ key, value }));
    await this.audit(actorId, "setting.update", { type: "setting", id: key }, { key });
    return this.settings.findOneOrFail({ where: { key } });
  }
}
