import { randomUUID } from "node:crypto";

import { UserRole } from "@datechain/types";
import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { RefreshToken } from "./refresh-token.entity";
import { TokenService } from "./token.service";

/** Minimal in-memory stand-in for the TypeORM repository used by TokenService. */
class FakeRepo {
  rows: RefreshToken[] = [];

  create(partial: Partial<RefreshToken>): RefreshToken {
    return { ...partial } as RefreshToken;
  }

  save(entity: RefreshToken): Promise<RefreshToken> {
    if (!entity.id) {
      entity.id = randomUUID();
      this.rows.push(entity);
    }
    return Promise.resolve(entity);
  }

  findOne({ where }: { where: Partial<RefreshToken> }): Promise<RefreshToken | null> {
    return Promise.resolve(this.rows.find((r) => matches(r, where)) ?? null);
  }

  findOneOrFail({ where }: { where: Partial<RefreshToken> }): Promise<RefreshToken> {
    const found = this.rows.find((r) => matches(r, where));
    if (!found) throw new Error("not found");
    return Promise.resolve(found);
  }

  update(criteria: Partial<RefreshToken>, patch: Partial<RefreshToken>): Promise<unknown> {
    for (const row of this.rows) {
      if (matches(row, criteria)) Object.assign(row, patch);
    }
    return Promise.resolve({});
  }
}

function matches(row: RefreshToken, where: Partial<RefreshToken>): boolean {
  return Object.entries(where).every(([k, v]) => (row as never)[k] === v);
}

const user = { id: "user-1", role: UserRole.User };

function makeService(): { service: TokenService; repo: FakeRepo } {
  const repo = new FakeRepo();
  const jwt = { sign: jest.fn().mockReturnValue("access.jwt.token") } as unknown as JwtService;
  const config = {
    get: jest.fn((key: string, def?: string) => {
      if (key === "JWT_ACCESS_TTL") return "15m";
      if (key === "JWT_REFRESH_TTL") return "30d";
      return def;
    }),
    getOrThrow: jest.fn().mockReturnValue("access-secret"),
  } as unknown as ConfigService;
  const service = new TokenService(jwt, config, repo as never);
  return { service, repo };
}

describe("TokenService", () => {
  it("issues an access + refresh pair and persists the refresh row", async () => {
    const { service, repo } = makeService();
    const pair = await service.issueTokenPair(user);
    expect(pair.accessToken).toBe("access.jwt.token");
    expect(pair.refreshToken).toMatch(/^[a-f0-9]{64}$/);
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0].revokedAt).toBeNull();
  });

  it("rotates a valid refresh token, revoking the old and linking the new", async () => {
    const { service, repo } = makeService();
    const first = await service.issueTokenPair(user);

    const rotated = await service.rotate(first.refreshToken, user);
    expect(rotated.refreshToken).not.toBe(first.refreshToken);
    expect(repo.rows).toHaveLength(2);

    const oldRow = repo.rows[0];
    const newRow = repo.rows[1];
    expect(oldRow.revokedAt).not.toBeNull();
    expect(oldRow.replacedByTokenId).toBe(newRow.id);
    expect(newRow.family).toBe(oldRow.family); // same rotation lineage
  });

  it("detects reuse: rotating an already-rotated token revokes the whole family", async () => {
    const { service, repo } = makeService();
    const first = await service.issueTokenPair(user);
    await service.rotate(first.refreshToken, user);

    await expect(service.rotate(first.refreshToken, user)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    // every token in the family is now revoked
    expect(repo.rows.every((r) => r.revokedAt !== null)).toBe(true);
  });

  it("rejects an unknown refresh token", async () => {
    const { service } = makeService();
    await expect(service.rotate("deadbeef", user)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects an expired refresh token", async () => {
    const { service, repo } = makeService();
    const pair = await service.issueTokenPair(user);
    repo.rows[0].expiresAt = new Date(Date.now() - 1000);
    await expect(service.rotate(pair.refreshToken, user)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("revoke marks a token revoked so it no longer validates", async () => {
    const { service } = makeService();
    const pair = await service.issueTokenPair(user);
    await service.revoke(pair.refreshToken);
    expect(await service.findValidRecord(pair.refreshToken)).toBeNull();
  });
});
