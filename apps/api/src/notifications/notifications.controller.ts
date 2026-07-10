import { Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthenticatedUser } from "../auth/decorators";

import { NotificationService } from "./notification.service";

@ApiTags("notifications")
@ApiBearerAuth("access-token")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("unreadOnly") unreadOnly?: string) {
    return this.notifications.list(user.userId, { unreadOnly: unreadOnly === "true" });
  }

  @Post("read")
  async read(@CurrentUser() user: AuthenticatedUser) {
    const updated = await this.notifications.markAllRead(user.userId);
    return { updated };
  }
}
