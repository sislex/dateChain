import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Match } from "../matching/match.entity";

import { Block } from "./block.entity";
import { BlockService } from "./block.service";
import { ModerationController } from "./moderation.controller";
import { Report } from "./report.entity";
import { ReportService } from "./report.service";

@Module({
  imports: [TypeOrmModule.forFeature([Report, Block, Match])],
  controllers: [ModerationController],
  providers: [ReportService, BlockService],
  exports: [ReportService, BlockService],
})
export class ModerationModule {}
