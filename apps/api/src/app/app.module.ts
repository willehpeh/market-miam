import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '@market-miam/auth-nestjs';
import { vendorPiiFields } from '@market-miam/market-days';
import { MarketDaysModule } from './market-days/market-days.module';
import { EventSourcingModule, Persistence } from './event-sourcing/event-sourcing.module';
import { DomainErrorFilter } from './domain-error.filter';
import { tokenVerifierFor } from './token-verifier.factory';
import { Migrations } from './database/migrations';

// Development runs entirely in memory so local dev needs no running postgres.
// Fail-safe like the token verifier: only the exact value `development` opts out
// of postgres; every other environment (and the production build) uses it.
const persistence: Persistence = process.env.NODE_ENV === 'development' ? 'memory' : 'postgres';

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
    EventSourcingModule.forRoot(persistence, vendorPiiFields),
    MarketDaysModule.forRoot(persistence),
  ],
  // Migrations run the pg pipeline on boot — postgres profile only.
  providers: [
    ...(persistence === 'postgres' ? [Migrations] : []),
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],
})
export class AppModule {}
