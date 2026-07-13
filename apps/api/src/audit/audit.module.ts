import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuditLog } from "../admin/audit-log.entity";

import { AuditService } from "./audit.service";

/** Global so any module (admin, dates, …) can record audit entries. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
