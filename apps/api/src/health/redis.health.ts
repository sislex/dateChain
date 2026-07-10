import { Inject, Injectable } from "@nestjs/common";
import { HealthCheckError, HealthIndicator, type HealthIndicatorResult } from "@nestjs/terminus";
import type Redis from "ioredis";

import { REDIS_CLIENT } from "../redis/redis.module";

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.ping();
      const healthy = pong === "PONG";
      const result = this.getStatus(key, healthy, { response: pong });
      if (healthy) return result;
      throw new HealthCheckError("Redis ping failed", result);
    } catch (error) {
      throw new HealthCheckError(
        "Redis check failed",
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
