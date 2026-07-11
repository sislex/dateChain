import { randomInt } from "node:crypto";

import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type Redis from "ioredis";

import { REDIS_CLIENT } from "../redis/redis.module";
import type { ContactChannel } from "../users/users.service";

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  private key(channel: ContactChannel, identifier: string): string {
    return `otp:${channel}:${identifier}`;
  }

  /** Generates and "sends" a 6-digit code (dev sender logs it). Returns the code in non-prod. */
  async request(channel: ContactChannel, identifier: string): Promise<string> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const ttl = this.config.get<number>("OTP_TTL_SECONDS", 300);
    await this.redis.set(this.key(channel, identifier), code, "EX", ttl);
    // Mock delivery. A real provider (SMS/email) plugs in here behind a flag.
    this.logger.log(`OTP for ${channel}:${identifier} = ${code}`);
    return code;
  }

  /** Verifies the code and consumes it on success (single-use). */
  async verify(channel: ContactChannel, identifier: string, code: string): Promise<boolean> {
    const key = this.key(channel, identifier);
    // DEV bypass: accept any code (phone-only login for local testing).
    if (this.config.get<string>("AUTH_DEV_LOGIN") === "true") {
      await this.redis.del(key);
      return true;
    }
    const stored = await this.redis.get(key);
    if (!stored || stored !== code) return false;
    await this.redis.del(key);
    return true;
  }
}
