import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { MESSAGE_CREATED, type MessageCreatedEvent } from "../chat/events";
import {
  MATCH_CREATED,
  SUPER_LIKE_SENT,
  type MatchCreatedEvent,
  type SuperLikeSentEvent,
} from "../matching/events";

import { NotificationType } from "./notification.entity";
import { NotificationService } from "./notification.service";

/** Turns domain events into per-user notifications. */
@Injectable()
export class NotificationListeners {
  constructor(private readonly notifications: NotificationService) {}

  @OnEvent(MATCH_CREATED)
  async onMatch(event: MatchCreatedEvent): Promise<void> {
    await Promise.all([
      this.notifications.create(event.userAId, NotificationType.Match, { matchId: event.matchId }),
      this.notifications.create(event.userBId, NotificationType.Match, { matchId: event.matchId }),
    ]);
  }

  @OnEvent(SUPER_LIKE_SENT)
  async onSuperLike(event: SuperLikeSentEvent): Promise<void> {
    await this.notifications.create(event.toUserId, NotificationType.SuperLike, {
      fromUserId: event.fromUserId,
    });
  }

  @OnEvent(MESSAGE_CREATED)
  async onMessage(event: MessageCreatedEvent): Promise<void> {
    await this.notifications.create(event.recipientId, NotificationType.Message, {
      matchId: event.matchId,
      messageId: event.message.id,
    });
  }
}
