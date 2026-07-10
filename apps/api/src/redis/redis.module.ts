import { Global, Inject, Injectable, Logger, Module, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

export const REDIS_CLIENT = Symbol("REDIS_CLIENT");

/**
 * Owns the ioredis lifecycle so the connection is closed on shutdown
 * (enableShutdownHooks / app.close), preventing dangling handles in tests
 * and clean termination in production.
 */
@Injectable()
export class RedisLifecycle implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    // Quit may reject if the connection already dropped during shutdown.
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger("Redis");
        const client = new Redis({
          host: config.getOrThrow<string>("REDIS_HOST"),
          port: config.getOrThrow<number>("REDIS_PORT"),
          maxRetriesPerRequest: null,
          lazyConnect: false,
        });
        // Without an 'error' listener ioredis rethrows connection errors as
        // uncaught exceptions (e.g. during shutdown); log and swallow instead.
        client.on("error", (err: Error) => logger.warn(`Redis error: ${err.message}`));
        return client;
      },
    },
    RedisLifecycle,
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
