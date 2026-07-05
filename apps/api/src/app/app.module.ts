import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '@market-monster/auth-nestjs';
import { MarketDaysModule } from './market-days/market-days.module';
import { EventSourcingModule } from './event-sourcing/event-sourcing.module';
import { DomainErrorFilter } from './domain-error.filter';
import { tokenVerifierFor } from './token-verifier.factory';
import { Migrations } from './database/migrations';

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
    EventSourcingModule.forRoot('postgres'),
    MarketDaysModule,
  ],
  providers: [Migrations, { provide: APP_FILTER, useClass: DomainErrorFilter }],
})
export class AppModule {}
