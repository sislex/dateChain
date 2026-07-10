import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module";
import { Message } from "../chat/message.entity";
import { Match } from "../matching/match.entity";
import { Swipe } from "../matching/swipe.entity";
import { ModerationModule } from "../moderation/moderation.module";
import { Report } from "../moderation/report.entity";
import { User } from "../users/user.entity";

import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AuditLog } from "./audit-log.entity";
import { Setting } from "./setting.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuditLog, Setting, Match, Message, Swipe, Report]),
    AuthModule,
    ModerationModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
