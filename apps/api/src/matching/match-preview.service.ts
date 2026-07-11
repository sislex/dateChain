import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import { Message } from "../chat/message.entity";
import { Photo } from "../profiles/photo.entity";
import { Profile } from "../profiles/profile.entity";

import { Match } from "./match.entity";
import { MatchService } from "./match.service";

export interface MatchPreview {
  matchId: string;
  createdAt: Date;
  partner: { userId: string; displayName: string; photoId: string | null };
  lastMessage: { text: string | null; senderId: string; createdAt: Date } | null;
  unreadCount: number;
}

@Injectable()
export class MatchPreviewService {
  constructor(
    private readonly matches: MatchService,
    @InjectRepository(Profile) private readonly profiles: Repository<Profile>,
    @InjectRepository(Photo) private readonly photos: Repository<Photo>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
  ) {}

  private partnerId(match: Match, userId: string): string {
    return match.userAId === userId ? match.userBId : match.userAId;
  }

  async listPreviews(userId: string): Promise<MatchPreview[]> {
    const matches = await this.matches.listForUser(userId);
    if (matches.length === 0) return [];

    const matchIds = matches.map((m) => m.id);
    const partnerIds = matches.map((m) => this.partnerId(m, userId));

    const [profiles, mainPhotos, lastMessages, unreadRows] = await Promise.all([
      this.profiles.find({ where: { userId: In(partnerIds) } }),
      this.photos.find({ where: { userId: In(partnerIds), isMain: true } }),
      this.messages
        .createQueryBuilder("m")
        .distinctOn(["m.matchId"])
        .where("m.matchId IN (:...matchIds)", { matchIds })
        .orderBy("m.matchId", "ASC")
        .addOrderBy("m.createdAt", "DESC")
        .getMany(),
      this.messages
        .createQueryBuilder("m")
        .select("m.matchId", "matchId")
        .addSelect("COUNT(*)", "cnt")
        .where("m.matchId IN (:...matchIds)", { matchIds })
        .andWhere("m.senderId != :userId", { userId })
        .andWhere("m.readAt IS NULL")
        .groupBy("m.matchId")
        .getRawMany<{ matchId: string; cnt: string }>(),
    ]);

    const nameByUser = new Map(profiles.map((p) => [p.userId, p.displayName]));
    const photoByUser = new Map(mainPhotos.map((p) => [p.userId, p.id]));
    const lastByMatch = new Map(lastMessages.map((m) => [m.matchId, m]));
    const unreadByMatch = new Map(unreadRows.map((r) => [r.matchId, Number(r.cnt)]));

    return matches.map((match) => {
      const partnerId = this.partnerId(match, userId);
      const last = lastByMatch.get(match.id);
      return {
        matchId: match.id,
        createdAt: match.createdAt,
        partner: {
          userId: partnerId,
          displayName: nameByUser.get(partnerId) ?? "Пользователь",
          photoId: photoByUser.get(partnerId) ?? null,
        },
        lastMessage: last
          ? { text: last.text, senderId: last.senderId, createdAt: last.createdAt }
          : null,
        unreadCount: unreadByMatch.get(match.id) ?? 0,
      };
    });
  }
}
