import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Match } from "./match.entity";
import { MatchService } from "./match.service";
import { MatchingController } from "./matching.controller";
import { Swipe } from "./swipe.entity";
import { SwipeService } from "./swipe.service";

@Module({
  imports: [TypeOrmModule.forFeature([Swipe, Match])],
  controllers: [MatchingController],
  providers: [SwipeService, MatchService],
  exports: [SwipeService, MatchService],
})
export class MatchingModule {}
