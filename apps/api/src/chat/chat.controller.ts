import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthenticatedUser } from "../auth/decorators";

import { ChatService } from "./chat.service";
import { SendMessageDto } from "./dto";

@ApiTags("chat")
@ApiBearerAuth("access-token")
@Controller("matches/:matchId/messages")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param("matchId") matchId: string,
    @Query("limit") limit?: string,
    @Query("before") before?: string,
  ) {
    return this.chat.listThread(user.userId, matchId, {
      limit: limit ? Number(limit) : undefined,
      before,
    });
  }

  @Post()
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param("matchId") matchId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.sendMessage(user.userId, matchId, { text: dto.text });
  }

  @Post("read")
  async read(@CurrentUser() user: AuthenticatedUser, @Param("matchId") matchId: string) {
    const updated = await this.chat.markRead(user.userId, matchId);
    return { updated };
  }
}
