import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Notification } from "./notification.entity";
import { NotificationListeners } from "./notification.listeners";
import { NotificationService } from "./notification.service";
import { NotificationsController } from "./notifications.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationsController],
  providers: [NotificationService, NotificationListeners],
  exports: [NotificationService],
})
export class NotificationsModule {}
