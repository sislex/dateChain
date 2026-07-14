import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { DateEntity } from "../dates/date.entity";
import { Profile } from "../profiles/profile.entity";
import { Transfer } from "../transfers/transfer.entity";

import { WalletController } from "./wallet.controller";
import { Wallet } from "./wallet.entity";
import { WalletService } from "./wallet.service";

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, Transfer, DateEntity, Profile])],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
