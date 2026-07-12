import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { DateEntity, DateStatus } from "../dates/date.entity";

import { Rating } from "./rating.entity";

export interface RatingSummary {
  average: number | null;
  count: number;
}

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating) private readonly ratings: Repository<Rating>,
    @InjectRepository(DateEntity) private readonly dates: Repository<DateEntity>,
  ) {}

  /** Rate the other participant of a confirmed date. */
  async rate(
    dateId: string,
    raterId: string,
    score: number,
    comment?: string,
  ): Promise<Rating> {
    if (score < 1 || score > 5) throw new BadRequestException("Score must be 1..5");
    const date = await this.dates.findOne({ where: { id: dateId } });
    if (!date) throw new NotFoundException("Date not found");
    if (date.proposerId !== raterId && date.inviteeId !== raterId) {
      throw new ForbiddenException("Not a participant");
    }
    if (date.status !== DateStatus.Confirmed) {
      throw new ConflictException("Can only rate a confirmed date");
    }
    const rateeId = date.proposerId === raterId ? date.inviteeId : date.proposerId;
    const existing = await this.ratings.findOne({ where: { dateId, raterId } });
    if (existing) throw new ConflictException("Already rated this date");
    return this.ratings.save(
      this.ratings.create({ dateId, raterId, rateeId, score, comment: comment ?? null }),
    );
  }

  /** Average score and count of ratings a user has received. */
  async summaryFor(userId: string): Promise<RatingSummary> {
    const row = await this.ratings
      .createQueryBuilder("r")
      .select("AVG(r.score)", "avg")
      .addSelect("COUNT(*)", "count")
      .where("r.rateeId = :userId", { userId })
      .getRawOne<{ avg: string | null; count: string }>();
    const count = Number(row?.count ?? 0);
    return { average: row?.avg ? Math.round(Number(row.avg) * 10) / 10 : null, count };
  }

  /** The viewer's rating for a date (if any) and whether they can still rate. */
  async forDate(dateId: string, userId: string): Promise<{ mine: Rating | null }> {
    const mine = await this.ratings.findOne({ where: { dateId, raterId: userId } });
    return { mine: mine ?? null };
  }
}
