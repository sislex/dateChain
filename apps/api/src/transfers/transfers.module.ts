import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { NotificationsModule } from "../notifications/notifications.module";
import { Profile } from "../profiles/profile.entity";
import { WalletModule } from "../wallet/wallet.module";

import { Transfer } from "./transfer.entity";
import { TransfersController } from "./transfers.controller";
import { TransfersService } from "./transfers.service";

@Module({
  imports: [TypeOrmModule.forFeature([Transfer, Profile]), WalletModule, NotificationsModule],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
