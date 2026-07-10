import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UsersModule } from "../users/users.module";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { OtpService } from "./otp.service";
import { RefreshToken } from "./refresh-token.entity";
import { TokenService } from "./token.service";
import { TotpService } from "./totp.service";

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([RefreshToken]),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, TokenService, TotpService, JwtStrategy],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
