import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { RedisIoAdapter } from "./chat/redis-io.adapter";
import { setupSwagger } from "./swagger";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.enableShutdownHooks();

  // Redis-backed Socket.IO adapter for horizontal scaling.
  const redisAdapter = new RedisIoAdapter(app, app.get(ConfigService));
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);

  setupSwagger(app);

  const config = app.get(ConfigService);
  const port = config.get<number>("API_PORT", 3000);
  await app.listen(port);
}

void bootstrap();
