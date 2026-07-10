import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  type HealthCheckResult,
} from "@nestjs/terminus";

import { Public } from "../auth/decorators";

import { RedisHealthIndicator } from "./redis.health";

@ApiTags("health")
@Public()
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOkResponse({ description: "Service is healthy (database and redis reachable)." })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck("database"),
      () => this.redis.isHealthy("redis"),
    ]);
  }
}
