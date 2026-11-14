// MUST be first: installs OpenTelemetry before any instrumented lib loads.
import './tracing';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { seedDev } from './app/dev-seed';
import { offerSourceCode } from './source-code-offer';
import { MARKET_MIAM_CORS_SETUP } from './cors-options';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(MARKET_MIAM_CORS_SETUP);
  app.use(offerSourceCode);
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
