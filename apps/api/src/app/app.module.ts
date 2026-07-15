import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '@market-miam/auth-nestjs';
import { vendorPiiFields } from '@market-miam/market-days';
import { MarketDaysModule } from './market-days/market-days.module';
import { EventSourcingModule } from './event-sourcing/event-sourcing.module';
import { InMemoryPersistenceModule } from './persistence/in-memory-persistence.module';
import { PostgresPersistenceModule } from './persistence/postgres-persistence.module';
import { DomainErrorFilter } from './domain-error.filter';
import { tokenVerifierFor } from './token-verifier.factory';

// Development runs entirely in memory so local dev needs no running postgres.
// Only the exact value `development` opts out of postgres;
// every other environment (and the production build) uses it.
const persistence =
  process.env.NODE_ENV === 'development' ? InMemoryPersistenceModule : PostgresPersistenceModule;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
    }),
    AuthModule.forRootAsync({
      inject: [ConfigService],
      useFactory: tokenVerifierFor,
    }),
    persistence,
    EventSourcingModule.forRoot(vendorPiiFields),
    MarketDaysModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: DomainErrorFilter }],
})
export class AppModule {}
