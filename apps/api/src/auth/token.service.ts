import { createHash, randomBytes, randomUUID } from "node:crypto";

import { UserRole } from "@datechain/types";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import type { User } from "../users/user.entity";

import { parseDurationMs } from "./duration";
import { RefreshToken } from "./refresh-token.entity";

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
  ) {}

  private hash(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  issueAccessToken(user: Pick<User, "id" | "role">): string {
    const payload: AccessTokenPayload = { sub: user.id, role: user.role };
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.config.get<string>("JWT_ACCESS_TTL", "15m"),
    });
  }

  private async createRefreshToken(userId: string, family: string): Promise<string> {
    const raw = randomBytes(32).toString("hex");
    const ttl = parseDurationMs(this.config.get<string>("JWT_REFRESH_TTL", "30d"));
    const entity = this.refreshTokens.create({
      userId,
      tokenHash: this.hash(raw),
      family,
      expiresAt: new Date(Date.now() + ttl),
      revokedAt: null,
      replacedByTokenId: null,
    });
    await this.refreshTokens.save(entity);
    return raw;
  }

  async issueTokenPair(user: Pick<User, "id" | "role">): Promise<TokenPair> {
    const accessToken = this.issueAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id, randomUUID());
    return {
      accessToken,
      refreshToken,
      expiresIn: Math.floor(parseDurationMs(this.config.get("JWT_ACCESS_TTL", "15m")) / 1000),
    };
  }

  /**
   * Rotates a refresh token. Reuse of an already-revoked token is treated as
   * theft: the whole family is revoked and the request rejected.
   */
  async rotate(rawToken: string, user: Pick<User, "id" | "role">): Promise<TokenPair> {
    const record = await this.refreshTokens.findOne({ where: { tokenHash: this.hash(rawToken) } });
    if (!record) throw new UnauthorizedException("Invalid refresh token");

    if (record.revokedAt) {
      await this.refreshTokens.update({ family: record.family }, { revokedAt: new Date() });
      throw new UnauthorizedException("Refresh token reuse detected");
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    const raw = await this.createRefreshToken(user.id, record.family);
    const replacement = await this.refreshTokens.findOneOrFail({
      where: { tokenHash: this.hash(raw) },
    });
    record.revokedAt = new Date();
    record.replacedByTokenId = replacement.id;
    await this.refreshTokens.save(record);

    return {
      accessToken: this.issueAccessToken(user),
      refreshToken: raw,
      expiresIn: Math.floor(parseDurationMs(this.config.get("JWT_ACCESS_TTL", "15m")) / 1000),
    };
  }

  /** Returns the token row regardless of state (for loading the owning user). */
  peek(rawToken: string): Promise<RefreshToken | null> {
    return this.refreshTokens.findOne({ where: { tokenHash: this.hash(rawToken) } });
  }

  async findValidRecord(rawToken: string): Promise<RefreshToken | null> {
    const record = await this.refreshTokens.findOne({ where: { tokenHash: this.hash(rawToken) } });
    if (!record || record.revokedAt || record.expiresAt.getTime() < Date.now()) return null;
    return record;
  }

  async revoke(rawToken: string): Promise<void> {
    await this.refreshTokens.update({ tokenHash: this.hash(rawToken) }, { revokedAt: new Date() });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokens.update({ userId, revokedAt: undefined }, { revokedAt: new Date() });
  }
}
