import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app/app.module';
import { sourceCodeUrl } from './source-code-url';

async function bootstrap() {
  try {
    // ponytail: nx runs executors from the workspace root, so this relative path resolves.
    process.loadEnvFile('apps/admin-api/.env');
  } catch {
    Logger.warn('No apps/admin-api/.env — Auth0 requests will fail until AUTH0_* env vars are set');
  }
  const app = await NestFactory.create(AppModule);
  // The API is a covered work users reach over the network, and it has no UI of its
  // own to carry the AGPL §13 offer — so every response points at its own source.
  const source = sourceCodeUrl();
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Source-Code', source);
    next();
  });
  app.setGlobalPrefix('api');
  const port = process.env.PORT || 3100;
  await app.listen(port);
  Logger.log(`🚀 admin-api running on http://localhost:${port}/api`);
}

bootstrap();
