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

  // ─── Blockchain (Hardhat local now, configurable for a real network) ───
  @IsString()
  @IsOptional()
  CHAIN_RPC_URL = "http://127.0.0.1:8545";

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  CHAIN_ID = 31337;

  /** Treasury/owner private key (Hardhat account #0 by default) — mints & funds. */
  @IsString()
  @IsOptional()
  TREASURY_PRIVKEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  /** 32-byte hex key for AES-256-GCM encryption of custodial private keys (DEV). */
  @IsString()
  @IsOptional()
  WALLET_ENC_KEY = "0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";

  /** Starting DATE balance minted to each new custodial wallet (demo). */
  @IsString()
  @IsOptional()
  WALLET_SEED_AMOUNT = "1000";

  /** ETH sent to each custodial wallet to pay gas (demo). */
  @IsString()
  @IsOptional()
  WALLET_GAS_ETH = "1";

  /** Path to the contracts deployment file (addresses + ABIs). */
  @IsString()
  @IsOptional()
  CONTRACTS_DEPLOYMENTS = "../../packages/contracts/deployments/localhost.json";

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
