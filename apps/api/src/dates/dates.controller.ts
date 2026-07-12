import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthenticatedUser } from "../auth/decorators";

import { DatesService } from "./dates.service";
import { ProposeDateDto } from "./dto";

@ApiTags("dates")
@ApiBearerAuth("access-token")
@Controller("dates")
export class DatesController {
  constructor(private readonly dates: DatesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.dates.list(user.userId);
  }

  @Post()
  propose(@CurrentUser() user: AuthenticatedUser, @Body() dto: ProposeDateDto) {
    return this.dates.propose(user.userId, dto.inviteeId, dto.amount, dto.message);
  }

  @Post(":id/accept")
  accept(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.dates.accept(id, user.userId);
  }

  @Post(":id/decline")
  decline(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.dates.decline(id, user.userId);
  }

  @Post(":id/confirm")
  confirm(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.dates.confirm(id, user.userId);
  }

  @Post(":id/cancel")
  cancel(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.dates.cancel(id, user.userId);
  }
}
