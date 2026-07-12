import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { DateEntity } from "../dates/date.entity";

import { Rating } from "./rating.entity";
import { RatingsController } from "./ratings.controller";
import { RatingsService } from "./ratings.service";

@Module({
  imports: [TypeOrmModule.forFeature([Rating, DateEntity])],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
