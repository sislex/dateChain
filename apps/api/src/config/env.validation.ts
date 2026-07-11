import "reflect-metadata";

import { Type, plainToInstance } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, validateSync } from "class-validator";

export enum NodeEnv {
  Development = "development",
  Test = "test",
  Production = "production",
}

/**
 * Typed, validated environment. Fails fast at boot if a required var is missing
 * or malformed, so misconfiguration never reaches runtime silently.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  API_PORT = 3000;

  @IsString()
  POSTGRES_HOST!: string;

  @Type(() => Number)
  @IsInt()
  POSTGRES_PORT!: number;

  @IsString()
  POSTGRES_USER!: string;

  @IsString()
  POSTGRES_PASSWORD!: string;

  @IsString()
  POSTGRES_DB!: string;

  @IsString()
  REDIS_HOST!: string;

  @Type(() => Number)
  @IsInt()
  REDIS_PORT!: number;

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_TTL = "15m";

  @IsString()
  @IsOptional()
  JWT_REFRESH_TTL = "30d";

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  OTP_TTL_SECONDS = 300;

  @IsString()
  @IsOptional()
  MEDIA_STORAGE_DIR = "./uploads";

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  MEDIA_MAX_FILE_SIZE_MB = 10;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  DAILY_LIKE_LIMIT = 100;

  @IsString()
  @IsOptional()
  FEATURE_REWIND = "false";

  /** DEV ONLY: when "true", OTP verification accepts any code (phone-only login). */
  @IsString()
  @IsOptional()
  AUTH_DEV_LOGIN = "false";

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  THROTTLE_TTL_SECONDS = 60;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  THROTTLE_LIMIT = 200;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n${errors.toString()}`);
  }
  return validated;
}
