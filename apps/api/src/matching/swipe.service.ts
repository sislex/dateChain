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

import {
  MATCH_CREATED,
  SUPER_LIKE_SENT,
  type MatchCreatedEvent,
  type SuperLikeSentEvent,
} from "./events";
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
    if (!reciprocal) {
      // No match yet: a Super Like still notifies the recipient (Tinder-style).
      if (action === SwipeAction.SuperLike) {
        this.events.emit(SUPER_LIKE_SENT, {
          fromUserId: actorId,
          toUserId: targetId,
        } satisfies SuperLikeSentEvent);
      }
      return { matched: false };
    }

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

  /**
   * People who liked (or super-liked) the user and haven't been swiped back yet —
   * the "Likes you" list. Includes the main photo for a card preview.
   */
  async incomingLikes(userId: string): Promise<IncomingLike[]> {
    const rows: Array<{
      userId: string;
      displayName: string;
      gender: string;
      age: string | number;
      photoId: string | null;
      action: string;
      rating: string | number | null;
      rating_count: string | number | null;
    }> = await this.swipes.query(
      `
      SELECT s."actorId" AS "userId", p."displayName", p.gender,
             date_part('year', age(p."birthDate")) AS age,
             ph.id AS "photoId", s.action,
             rt.avg AS rating, rt.cnt AS rating_count
      FROM swipes s
      JOIN profiles p ON p."userId" = s."actorId"
      LEFT JOIN photos ph ON ph."userId" = s."actorId" AND ph."isMain" = true
      LEFT JOIN (
        SELECT "rateeId", avg(score) AS avg, count(*) AS cnt
        FROM ratings GROUP BY "rateeId"
      ) rt ON rt."rateeId" = s."actorId"
      WHERE s."targetId" = $1
        AND s.action IN ('LIKE','SUPER_LIKE')
        AND NOT EXISTS (
          SELECT 1 FROM swipes me WHERE me."actorId" = $1 AND me."targetId" = s."actorId"
        )
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b."blockerId" = $1 AND b."blockedId" = s."actorId")
             OR (b."blockerId" = s."actorId" AND b."blockedId" = $1)
        )
      ORDER BY s.action DESC, s."createdAt" DESC
      `,
      [userId],
    );
    return rows.map((r) => ({
      userId: r.userId,
      displayName: r.displayName,
      gender: r.gender,
      age: Math.trunc(Number(r.age)),
      photoId: r.photoId,
      superLike: r.action === "SUPER_LIKE",
      rating: r.rating === null ? null : Math.round(Number(r.rating) * 10) / 10,
      ratingCount: Number(r.rating_count ?? 0),
    }));
  }
}

export interface IncomingLike {
  userId: string;
  displayName: string;
  gender: string;
  age: number;
  photoId: string | null;
  superLike: boolean;
  /** Average date rating (1–5, one decimal) or null if not rated yet. */
  rating: number | null;
  ratingCount: number;
}
