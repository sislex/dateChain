import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard, RolesGuard } from "./auth/guards";
import { ChainModule } from "./chain/chain.module";
import { ChatModule } from "./chat/chat.module";
import { validateEnv } from "./config/env.validation";
import { buildDataSourceOptions } from "./database/typeorm.config";
import { DatesModule } from "./dates/dates.module";
import { DiscoveryModule } from "./discovery/discovery.module";
import { HealthModule } from "./health/health.module";
import { MatchingModule } from "./matching/matching.module";
import { ModerationModule } from "./moderation/moderation.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ProfilesModule } from "./profiles/profiles.module";
import { RedisModule } from "./redis/redis.module";
import { UsersModule } from "./users/users.module";
import { WalletModule } from "./wallet/wallet.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [".env", "../../.env"],
      validate: validateEnv,
    }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>("THROTTLE_TTL_SECONDS", 60) * 1000,
          limit: config.get<number>("THROTTLE_LIMIT", 200),
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...buildDataSourceOptions({
          POSTGRES_HOST: config.getOrThrow("POSTGRES_HOST"),
          POSTGRES_PORT: config.getOrThrow("POSTGRES_PORT"),
          POSTGRES_USER: config.getOrThrow("POSTGRES_USER"),
          POSTGRES_PASSWORD: config.getOrThrow("POSTGRES_PASSWORD"),
          POSTGRES_DB: config.getOrThrow("POSTGRES_DB"),
        }),
        autoLoadEntities: true,
      }),
    }),
    RedisModule,
    ChainModule,
    UsersModule,
    AuthModule,
    WalletModule,
    ProfilesModule,
    DiscoveryModule,
    MatchingModule,
    ChatModule,
    DatesModule,
    ModerationModule,
    NotificationsModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    // Rate limiting first, then auth (JWT unless @Public), then role checks.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
