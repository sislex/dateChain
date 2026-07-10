import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Match, canonicalPair } from "../matching/match.entity";

import { Block } from "./block.entity";

@Injectable()
export class BlockService {
  constructor(
    @InjectRepository(Block)
    private readonly blocks: Repository<Block>,
    @InjectRepository(Match)
    private readonly matches: Repository<Match>,
  ) {}

  /** Blocks a user and tears down any active match (removing them from chat). */
  async block(blockerId: string, blockedId: string): Promise<Block> {
    if (blockerId === blockedId) throw new BadRequestException("Cannot block yourself");

    const existing = await this.blocks.findOne({ where: { blockerId, blockedId } });
    if (existing) return existing;

    const block = await this.blocks.save(this.blocks.create({ blockerId, blockedId }));

    const [userAId, userBId] = canonicalPair(blockerId, blockedId);
    await this.matches.update(
      { userAId, userBId },
      { unmatchedAt: new Date(), unmatchedBy: blockerId },
    );
    return block;
  }

  listBlocked(blockerId: string): Promise<Block[]> {
    return this.blocks.find({ where: { blockerId }, order: { createdAt: "DESC" } });
  }
}
