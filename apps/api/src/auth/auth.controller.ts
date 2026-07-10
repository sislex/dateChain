import { UserRole } from "@datechain/types";
import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthService } from "./auth.service";
import { CurrentUser, Public, Roles, type AuthenticatedUser } from "./decorators";
import { AdminLoginDto, RefreshDto, RequestOtpDto, VerifyOtpDto } from "./dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("otp/request")
  @HttpCode(200)
  async requestOtp(@Body() dto: RequestOtpDto): Promise<{ sent: true }> {
    await this.auth.requestOtp(dto.channel, dto.identifier);
    return { sent: true };
  }

  @Public()
  @Post("otp/verify")
  @HttpCode(200)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.channel, dto.identifier, dto.code);
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post("admin/login")
  @HttpCode(200)
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.auth.adminLogin(dto.email, dto.password, dto.totp);
  }

  @Post("logout")
  @HttpCode(204)
  @ApiBearerAuth("access-token")
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }

  @Get("me")
  @ApiBearerAuth("access-token")
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  /** RBAC probe: requires ADMIN or higher. Used to verify role enforcement. */
  @Get("admin/ping")
  @Roles(UserRole.Admin)
  @ApiBearerAuth("access-token")
  adminPing(): { ok: true } {
    return { ok: true };
  }
}
