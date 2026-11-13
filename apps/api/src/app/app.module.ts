import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule, OperatorAuthModule } from '@market-miam/auth-nestjs';
import { vendorPiiFields, vendorPiiKeyScopes } from '@market-miam/market-days';
import { MarketDaysModule } from './market-days/market-days.module';
import { OpsModule } from './ops/ops.module';
import { EventSourcingModule } from './event-sourcing/event-sourcing.module';
import { InMemoryPersistenceModule } from './persistence/in-memory-persistence.module';
import { PostgresPersistenceModule } from './persistence/postgres-persistence.module';
import { DevelopmentAccountsModule } from './ops/accounts/development-accounts.module';
import { Auth0AccountsModule } from './ops/accounts/auth0-accounts.module';
import { globalFilters } from './global-filters';
import { tokenVerifierFor } from './token-verifier.factory';
import { operatorTokenVerifierFor } from './operator-token-verifier.factory';

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
    OperatorAuthModule.forRootAsync({
      inject: [ConfigService],
      useFactory: operatorTokenVerifierFor,
    }),
    process.env.NODE_ENV === 'development'
      // Development runs entirely in memory so local dev needs no running postgres.
      // Only the exact value `development` opts out of postgres;
      // every other environment (and the production build) uses it.
      ? InMemoryPersistenceModule
      : PostgresPersistenceModule,
    // Likewise for the identity provider: Auth0 everywhere but `development`.
    process.env.NODE_ENV === 'development' ? DevelopmentAccountsModule : Auth0AccountsModule,
    EventSourcingModule.forRoot(vendorPiiFields, vendorPiiKeyScopes),
    MarketDaysModule,
    OpsModule,
  ],
  providers: [...globalFilters],
})
export class AppModule {}
