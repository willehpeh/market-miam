import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  try {
    // ponytail: nx runs executors from the workspace root, so this relative path resolves.
    process.loadEnvFile('apps/admin-api/.env');
  } catch {
    Logger.warn('No apps/admin-api/.env — Auth0 requests will fail until AUTH0_* env vars are set');
  }
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const port = process.env.PORT || 3100;
  await app.listen(port);
  Logger.log(`🚀 admin-api running on http://localhost:${port}/api`);
}

bootstrap();
