import { writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Emits the OpenAPI spec to <repo-root>/openapi.json.
 *
 * Runs Nest in preview mode: the module graph and routes are scanned for
 * metadata, but providers are not instantiated and no DB/Redis connection is
 * opened — so the spec can be generated in CI without any infrastructure.
 *
 * Placeholder env vars are set before importing AppModule because ConfigModule
 * validates the environment eagerly at import time; the values are never used
 * to open a connection in preview mode.
 */
function ensureEnv(): void {
  const defaults: Record<string, string> = {
    NODE_ENV: "development",
    POSTGRES_HOST: "localhost",
    POSTGRES_PORT: "5432",
    POSTGRES_USER: "datechain",
    POSTGRES_PASSWORD: "datechain",
    POSTGRES_DB: "datechain",
    REDIS_HOST: "localhost",
    REDIS_PORT: "6379",
    JWT_ACCESS_SECRET: "dev-access",
    JWT_REFRESH_SECRET: "dev-refresh",
  };
  for (const [key, value] of Object.entries(defaults)) {
    process.env[key] ??= value;
  }
}

async function main(): Promise<void> {
  ensureEnv();
  const { NestFactory } = await import("@nestjs/core");
  const { AppModule } = await import("../app.module");
  const { buildOpenApiDocument } = await import("../swagger");

  const app = await NestFactory.create(AppModule, { preview: true, logger: false });
  const document = buildOpenApiDocument(app);
  const outPath = join(__dirname, "..", "..", "..", "..", "openapi.json");
  writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
  // eslint-disable-next-line no-console
  console.log(`OpenAPI spec written to ${outPath}`);
}

void main().then(
  () => process.exit(0),
  (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  },
);
