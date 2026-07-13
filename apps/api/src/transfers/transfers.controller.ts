import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthenticatedUser } from "../auth/decorators";

import { SendTransferDto } from "./dto";
import { TransfersService } from "./transfers.service";

@ApiTags("transfers")
@ApiBearerAuth("access-token")
@Controller("transfers")
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.transfers.list(user.userId);
  }

  @Get("fee")
  async fee() {
    return { feeBps: await this.transfers.getFeeBps() };
  }

  @Post()
  send(@CurrentUser() user: AuthenticatedUser, @Body() dto: SendTransferDto) {
    return this.transfers.send(user.userId, dto.toUserId, dto.amount);
  }
}
