import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { NOTIFICATION_CREATED, Notification, NotificationType } from "./notification.entity";

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    private readonly events: EventEmitter2,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    payload: Record<string, unknown> = {},
  ): Promise<Notification> {
    const notification = await this.notifications.save(
      this.notifications.create({ userId, type, payload, readAt: null }),
    );
    this.events.emit(NOTIFICATION_CREATED, { userId, notification });
    return notification;
  }

  list(
    userId: string,
    opts: { limit?: number; unreadOnly?: boolean } = {},
  ): Promise<Notification[]> {
    const where = opts.unreadOnly ? { userId, readAt: undefined } : { userId };
    return this.notifications.find({
      where,
      order: { createdAt: "DESC" },
      take: Math.min(opts.limit ?? 50, 100),
    });
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.notifications
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: () => "now()" })
      .where("userId = :userId", { userId })
      .andWhere("readAt IS NULL")
      .execute();
    return result.affected ?? 0;
  }
}
