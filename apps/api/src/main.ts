/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

// MUST be first: installs OpenTelemetry before any instrumented lib loads.
import './tracing';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app/app.module';
import { seedDev } from './app/dev-seed';
import { sourceCodeUrl } from './source-code-url';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    // Customer storefronts are served per-vendor on *.marketmiam.fr, so allow any
    // first-party subdomain (covers app.marketmiam.fr and every storefront origin).
    origin: [/^https:\/\/([a-z0-9-]+\.)?marketmiam\.fr$/, 'http://localhost:4200'],
    // Otherwise the source offer below is stripped from what browser JS can read.
    exposedHeaders: ['X-Source-Code'],
  });
  // The API is a covered work users reach over the network, and it has no UI of its
  // own to carry the AGPL §13 offer — so every response points at its own source.
  const source = sourceCodeUrl();
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Source-Code', source);
    next();
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  if (process.env.NODE_ENV === 'development') {
    await seedDev(app);
  }
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap().catch((error) => {
  Logger.error('Failed to start application', error);
  process.exit(1);
});
