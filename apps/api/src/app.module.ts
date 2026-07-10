import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard, RolesGuard } from "./auth/guards";
import { validateEnv } from "./config/env.validation";
import { buildDataSourceOptions } from "./database/typeorm.config";
import { DiscoveryModule } from "./discovery/discovery.module";
import { HealthModule } from "./health/health.module";
import { MatchingModule } from "./matching/matching.module";
import { ProfilesModule } from "./profiles/profiles.module";
import { RedisModule } from "./redis/redis.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [".env", "../../.env"],
      validate: validateEnv,
    }),
    EventEmitterModule.forRoot(),
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
    UsersModule,
    AuthModule,
    ProfilesModule,
    DiscoveryModule,
    MatchingModule,
    HealthModule,
  ],
  providers: [
    // Global auth: every route requires a valid JWT unless marked @Public(),
    // then role requirements from @Roles() are enforced.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
