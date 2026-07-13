import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { MatchingModule } from "../matching/matching.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { Profile } from "../profiles/profile.entity";
import { Rating } from "../ratings/rating.entity";
import { WalletModule } from "../wallet/wallet.module";

import { DateEntity } from "./date.entity";
import { DatesController } from "./dates.controller";
import { DatesService } from "./dates.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([DateEntity, Profile, Rating]),
    WalletModule,
    MatchingModule,
    NotificationsModule,
  ],
  controllers: [DatesController],
  providers: [DatesService],
  exports: [DatesService],
})
export class DatesModule {}
