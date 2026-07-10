import { Body, Controller, Delete, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthenticatedUser } from "../auth/decorators";

import { SwipeDto } from "./dto";
import { MatchService } from "./match.service";
import { SwipeService } from "./swipe.service";

@ApiTags("matching")
@ApiBearerAuth("access-token")
@Controller()
export class MatchingController {
  constructor(
    private readonly swipes: SwipeService,
    private readonly matches: MatchService,
  ) {}

  @Post("swipes")
  swipe(@CurrentUser() user: AuthenticatedUser, @Body() dto: SwipeDto) {
    return this.swipes.swipe(user.userId, dto.targetId, dto.action);
  }

  @Post("swipes/rewind")
  @HttpCode(200)
  rewind(@CurrentUser() user: AuthenticatedUser) {
    return this.swipes.rewind(user.userId);
  }

  @Get("matches")
  listMatches(@CurrentUser() user: AuthenticatedUser) {
    return this.matches.listForUser(user.userId);
  }

  @Delete("matches/:id")
  async unmatch(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.matches.unmatch(id, user.userId);
    return { unmatched: true };
  }
}
