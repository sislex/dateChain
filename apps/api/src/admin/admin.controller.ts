import { UserRole } from "@datechain/types";
import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, Roles, type AuthenticatedUser } from "../auth/decorators";
import { UserStatus } from "../users/user.entity";

import { AdminService } from "./admin.service";
import { ResolveReportDto, SetServiceWalletDto, SetSettingDto, SetStatusDto } from "./dto";

@ApiTags("admin")
@ApiBearerAuth("access-token")
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("metrics")
  @Roles(UserRole.Analyst)
  metrics() {
    return this.admin.metrics();
  }

  @Get("users")
  @Roles(UserRole.Support)
  listUsers(
    @Query("status") status?: UserStatus,
    @Query("q") q?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.admin.listUsers({
      status,
      q,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get("users/:id")
  @Roles(UserRole.Support)
  getUser(@Param("id") id: string) {
    return this.admin.getUser(id);
  }

  @Post("users/:id/status")
  @Roles(UserRole.Moderator)
  setStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: SetStatusDto,
  ) {
    return this.admin.setStatus(actor.userId, id, dto.status);
  }

  @Post("users/:id/impersonate")
  @Roles(UserRole.SuperAdmin)
  impersonate(@CurrentUser() actor: AuthenticatedUser, @Param("id") id: string) {
    return this.admin.impersonate(actor.userId, id);
  }

  @Get("reports")
  @Roles(UserRole.Moderator)
  reports() {
    return this.admin.reportQueue();
  }

  @Post("reports/:id/resolve")
  @Roles(UserRole.Moderator)
  resolveReport(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.admin.resolveReport(actor.userId, id, dto.status, dto.resolution, dto.ban);
  }

  @Get("audit")
  @Roles(UserRole.Admin)
  audit() {
    return this.admin.listAudit();
  }

  @Get("service-wallet")
  @Roles(UserRole.Admin)
  getServiceWallet() {
    return this.admin.getServiceWallet();
  }

  @Put("service-wallet")
  @Roles(UserRole.Admin)
  setServiceWallet(@CurrentUser() actor: AuthenticatedUser, @Body() dto: SetServiceWalletDto) {
    return this.admin.setServiceWallet(actor.userId, dto.address);
  }

  @Get("settings")
  @Roles(UserRole.Admin)
  settings() {
    return this.admin.getSettings();
  }

  @Put("settings/:key")
  @Roles(UserRole.Admin)
  setSetting(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("key") key: string,
    @Body() dto: SetSettingDto,
  ) {
    return this.admin.setSetting(actor.userId, key, dto.value);
  }
}
