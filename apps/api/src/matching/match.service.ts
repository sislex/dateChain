import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, IsNull, Repository } from "typeorm";

import { Match, canonicalPair } from "./match.entity";

@Injectable()
export class MatchService {
  constructor(
    @InjectRepository(Match)
    private readonly matches: Repository<Match>,
  ) {}

  /**
   * Creates a match for the pair if one doesn't already exist. Safe against
   * races via the unique pair index (conflict → returns the existing match).
   */
  async createForPair(a: string, b: string): Promise<Match> {
    const [userAId, userBId] = canonicalPair(a, b);
    const existing = await this.matches.findOne({ where: { userAId, userBId } });
    if (existing) return existing;
    try {
      const match = this.matches.create({ userAId, userBId, unmatchedAt: null, unmatchedBy: null });
      return await this.matches.save(match);
    } catch {
      // Unique-violation from a concurrent insert — fetch the winner.
      const winner = await this.matches.findOne({ where: { userAId, userBId } });
      if (!winner) throw new Error("Failed to create or find match");
      return winner;
    }
  }

  listForUser(userId: string): Promise<Match[]> {
    return this.matches
      .createQueryBuilder("m")
      .where("m.unmatchedAt IS NULL")
      .andWhere(
        new Brackets((qb) => {
          qb.where("m.userAId = :userId", { userId }).orWhere("m.userBId = :userId", { userId });
        }),
      )
      .orderBy("m.createdAt", "DESC")
      .getMany();
  }

  async findActiveById(matchId: string, userId: string): Promise<Match> {
    const match = await this.matches.findOne({ where: { id: matchId, unmatchedAt: IsNull() } });
    if (!match) throw new NotFoundException("Match not found");
    if (match.userAId !== userId && match.userBId !== userId) {
      throw new ForbiddenException("Not a participant");
    }
    return match;
  }

  async unmatch(matchId: string, userId: string): Promise<void> {
    const match = await this.findActiveById(matchId, userId);
    match.unmatchedAt = new Date();
    match.unmatchedBy = userId;
    await this.matches.save(match);
  }
}
