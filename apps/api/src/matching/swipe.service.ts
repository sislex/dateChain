import { SwipeAction } from "@datechain/types";
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { In, MoreThanOrEqual, Repository } from "typeorm";

import { MATCH_CREATED, type MatchCreatedEvent } from "./events";
import { MatchService } from "./match.service";
import { Swipe } from "./swipe.entity";

export interface SwipeResult {
  matched: boolean;
  matchId?: string;
  duplicate?: boolean;
}

const LIKE_ACTIONS = [SwipeAction.Like, SwipeAction.SuperLike];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class SwipeService {
  constructor(
    @InjectRepository(Swipe)
    private readonly swipes: Repository<Swipe>,
    private readonly matches: MatchService,
    private readonly events: EventEmitter2,
    private readonly config: ConfigService,
  ) {}

  async swipe(actorId: string, targetId: string, action: SwipeAction): Promise<SwipeResult> {
    if (actorId === targetId) throw new BadRequestException("Cannot swipe yourself");

    const existing = await this.swipes.findOne({ where: { actorId, targetId } });
    if (existing) {
      // Idempotent: report current match status without re-counting or re-matching.
      const match = await this.matches
        .listForUser(actorId)
        .then((list) => list.find((m) => m.userAId === targetId || m.userBId === targetId));
      return { matched: Boolean(match), matchId: match?.id, duplicate: true };
    }

    if (LIKE_ACTIONS.includes(action)) {
      const limit = this.config.get<number>("DAILY_LIKE_LIMIT", 100);
      const usedToday = await this.swipes.count({
        where: { actorId, action: In(LIKE_ACTIONS), createdAt: MoreThanOrEqual(startOfToday()) },
      });
      if (usedToday >= limit) {
        throw new HttpException("Daily like limit reached", HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    await this.swipes.save(this.swipes.create({ actorId, targetId, action }));

    if (!LIKE_ACTIONS.includes(action)) return { matched: false };

    const reciprocal = await this.swipes.findOne({
      where: { actorId: targetId, targetId: actorId, action: In(LIKE_ACTIONS) },
    });
    if (!reciprocal) return { matched: false };

    const match = await this.matches.createForPair(actorId, targetId);
    this.events.emit(MATCH_CREATED, {
      matchId: match.id,
      userAId: match.userAId,
      userBId: match.userBId,
    } satisfies MatchCreatedEvent);
    return { matched: true, matchId: match.id };
  }

  /** Premium rewind (feature-flagged): removes the actor's most recent swipe. */
  async rewind(actorId: string): Promise<{ rewound: boolean; targetId?: string }> {
    if (this.config.get<string>("FEATURE_REWIND", "false") !== "true") {
      throw new ForbiddenException("Rewind is not available");
    }
    const last = await this.swipes.findOne({
      where: { actorId },
      order: { createdAt: "DESC" },
    });
    if (!last) return { rewound: false };
    await this.swipes.delete({ id: last.id });
    return { rewound: true, targetId: last.targetId };
  }
}
