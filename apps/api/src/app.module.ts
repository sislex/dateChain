import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { validateEnv } from "./config/env.validation";
import { buildDataSourceOptions } from "./database/typeorm.config";
import { HealthModule } from "./health/health.module";
import { RedisModule } from "./redis/redis.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [".env", "../../.env"],
      validate: validateEnv,
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
    HealthModule,
  ],
})
export class AppModule {}
