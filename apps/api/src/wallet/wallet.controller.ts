import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthenticatedUser } from "../auth/decorators";

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
}
