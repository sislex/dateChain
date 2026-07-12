import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthenticatedUser } from "../auth/decorators";

import { RateDto } from "./dto";
import { RatingsService } from "./ratings.service";

@ApiTags("ratings")
@ApiBearerAuth("access-token")
@Controller()
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Post("dates/:id/rating")
  rate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: RateDto,
  ) {
    return this.ratings.rate(id, user.userId, dto.score, dto.comment);
  }

  @Get("dates/:id/rating")
  forDate(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.ratings.forDate(id, user.userId);
  }

  @Get("users/:userId/rating")
  summary(@Param("userId") userId: string) {
    return this.ratings.summaryFor(userId);
  }
}
