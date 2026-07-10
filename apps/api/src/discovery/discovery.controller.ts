import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthenticatedUser } from "../auth/decorators";

import { DiscoveryService } from "./discovery.service";

@ApiTags("discovery")
@ApiBearerAuth("access-token")
@Controller("discovery")
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get("deck")
  deck(
    @CurrentUser() user: AuthenticatedUser,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.discovery.getDeck(user.userId, limit);
  }
}
