import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthenticatedUser } from "../auth/decorators";

import { BlockService } from "./block.service";
import { BlockUserDto, CreateReportDto } from "./dto";
import { ReportService } from "./report.service";

@ApiTags("moderation")
@ApiBearerAuth("access-token")
@Controller()
export class ModerationController {
  constructor(
    private readonly reports: ReportService,
    private readonly blocks: BlockService,
  ) {}

  @Post("reports")
  report(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReportDto) {
    return this.reports.create(user.userId, dto);
  }

  @Post("blocks")
  block(@CurrentUser() user: AuthenticatedUser, @Body() dto: BlockUserDto) {
    return this.blocks.block(user.userId, dto.userId);
  }

  @Get("blocks")
  listBlocks(@CurrentUser() user: AuthenticatedUser) {
    return this.blocks.listBlocked(user.userId);
  }
}
