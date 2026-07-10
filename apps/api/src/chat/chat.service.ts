import { BadRequestException, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";

import { Match } from "../matching/match.entity";
import { MatchService } from "../matching/match.service";

import { MESSAGE_CREATED, MESSAGES_READ } from "./events";
import { Message, MessageType } from "./message.entity";

export interface SendMessageInput {
  type?: MessageType;
  text?: string;
  imageStorageKey?: string;
}

const MAX_PAGE = 50;

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private readonly messages: Repository<Message>,
    private readonly matches: MatchService,
    private readonly events: EventEmitter2,
  ) {}

  private recipientOf(match: Match, senderId: string): string {
    return match.userAId === senderId ? match.userBId : match.userAId;
  }

  /** Returns messages newest-first, optionally before a cursor (ISO timestamp). */
  async listThread(
    userId: string,
    matchId: string,
    opts: { limit?: number; before?: string } = {},
  ): Promise<Message[]> {
    await this.matches.findActiveById(matchId, userId); // participant check (403/404)
    const limit = Math.min(Math.max(1, opts.limit ?? 30), MAX_PAGE);
    return this.messages.find({
      where: {
        matchId,
        ...(opts.before ? { createdAt: LessThan(new Date(opts.before)) } : {}),
      },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async sendMessage(userId: string, matchId: string, input: SendMessageInput): Promise<Message> {
    const match = await this.matches.findActiveById(matchId, userId);
    const type = input.type ?? MessageType.Text;
    if (type === MessageType.Text && !input.text?.trim()) {
      throw new BadRequestException("Message text is required");
    }
    if (type === MessageType.Image && !input.imageStorageKey) {
      throw new BadRequestException("Image key is required");
    }

    const message = await this.messages.save(
      this.messages.create({
        matchId,
        senderId: userId,
        type,
        text: input.text ?? null,
        imageStorageKey: input.imageStorageKey ?? null,
        readAt: null,
      }),
    );

    this.events.emit(MESSAGE_CREATED, {
      matchId,
      recipientId: this.recipientOf(match, userId),
      message,
    });
    return message;
  }

  /** Marks all messages from the other participant as read. Returns count updated. */
  async markRead(userId: string, matchId: string): Promise<number> {
    await this.matches.findActiveById(matchId, userId);
    const result = await this.messages
      .createQueryBuilder()
      .update(Message)
      .set({ readAt: () => "now()" })
      .where("matchId = :matchId", { matchId })
      .andWhere("senderId != :userId", { userId })
      .andWhere("readAt IS NULL")
      .execute();

    this.events.emit(MESSAGES_READ, { matchId, readerId: userId });
    return result.affected ?? 0;
  }
}
