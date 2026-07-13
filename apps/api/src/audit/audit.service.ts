import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuditLog } from "../admin/audit-log.entity";

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly audits: Repository<AuditLog>,
  ) {}

  /** Appends an entry to the audit log. `target.id` must be a UUID column value. */
  async record(
    actorId: string,
    action: string,
    target?: { type: string; id: string },
    meta: Record<string, unknown> = {},
  ): Promise<void> {
    await this.audits.save(
      this.audits.create({
        actorId,
        action,
        targetType: target?.type ?? null,
        targetId: target?.id ?? null,
        meta,
      }),
    );
  }
}
