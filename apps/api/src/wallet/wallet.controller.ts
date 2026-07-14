import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthenticatedUser } from "../auth/decorators";

import { TopUpDto } from "./dto";
import { WalletService } from "./wallet.service";

@ApiTags("wallet")
@ApiBearerAuth("access-token")
@Controller("wallet")
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  /** The current user's custodial wallet: address + DATE balance. */
  @Get()
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.wallet.getView(user.userId);
  }

  /** The current user's DATE transactions (on-chain token transfers). */
  @Get("transactions")
  transactions(@CurrentUser() user: AuthenticatedUser) {
    return this.wallet.transactions(user.userId);
  }

  /** Unified history (dates, transfers, top-ups) with counterpart names and fees. */
  @Get("history")
  history(@CurrentUser() user: AuthenticatedUser) {
    return this.wallet.history(user.userId);
  }

  /** Dev faucet: top up the wallet with DATE from the treasury. */
  @Post("topup")
  topUp(@CurrentUser() user: AuthenticatedUser, @Body() dto: TopUpDto) {
    return this.wallet.topUp(user.userId, dto.amount);
  }
}
