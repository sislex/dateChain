import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Message } from "../chat/message.entity";
import { Photo } from "../profiles/photo.entity";
import { Profile } from "../profiles/profile.entity";

import { MatchPreviewService } from "./match-preview.service";
import { Match } from "./match.entity";
import { MatchService } from "./match.service";
import { MatchingController } from "./matching.controller";
import { Swipe } from "./swipe.entity";
import { SwipeService } from "./swipe.service";

@Module({
  imports: [TypeOrmModule.forFeature([Swipe, Match, Profile, Photo, Message])],
  controllers: [MatchingController],
  providers: [SwipeService, MatchService, MatchPreviewService],
  exports: [SwipeService, MatchService],
})
export class MatchingModule {}
