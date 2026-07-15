import { randomBytes } from 'node:crypto';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { EventStore, PostgresUnitOfWork, UnitOfWork } from '@market-miam/event-sourcing';
import {
  CatalogueViews,
  MarketScheduleViews,
  PostgresCatalogueViews,
  PostgresMarketScheduleViews,
  PostgresSubdomainRegistry,
  PostgresVendorStorefrontViews,
  SubdomainRegistry,
  vendorPiiFields,
  VendorStorefrontViews,
} from '@market-miam/market-days';
import { StaticTokenVerifier } from '@market-miam/auth';
import { AuthModule } from '@market-miam/auth-nestjs';
import { ApplicationEventStore } from '../event-sourcing/application.event-store';
import { EventSourcingModule } from '../event-sourcing/event-sourcing.module';
import { MarketDaysModule } from '../market-days/market-days.module';
import { testVendor } from '../testing/api-test-app';
import { PostgresPersistenceModule } from './postgres-persistence.module';

// Resolves the postgres profile's graph without a database: nothing here calls a
// port, and the things that would connect (the Pool, migrations, LISTEN) are lazy
// or start on lifecycle hooks that compile() never fires.
//
// This guards the arm of AppModule's persistence branch every other api spec skips
// — they all run on memory. A missing provider or a bad inject list on this side is
// invisible to the type checker, so without this it would surface as a failed
// production boot.
describe('PostgresPersistenceModule', () => {
  const compile = () =>
    Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              DATABASE_CONNECTION_STRING: 'postgres://user:password@localhost:5432/nowhere',
              MASTER_KEY: randomBytes(32).toString('base64'),
            }),
          ],
        }),
        AuthModule.forRootAsync({ useFactory: () => new StaticTokenVerifier(testVendor) }),
        PostgresPersistenceModule,
        EventSourcingModule.forRoot(vendorPiiFields),
        MarketDaysModule,
      ],
    }).compile();

  it('answers every port with a postgres adapter', async () => {
    const app = await compile();

    expect([
      app.get(EventStore),
      app.get(UnitOfWork),
      app.get(VendorStorefrontViews),
      app.get(CatalogueViews),
      app.get(MarketScheduleViews),
      app.get(SubdomainRegistry),
    ]).toEqual([
      expect.any(ApplicationEventStore),
      expect.any(PostgresUnitOfWork),
      expect.any(PostgresVendorStorefrontViews),
      expect.any(PostgresCatalogueViews),
      expect.any(PostgresMarketScheduleViews),
      expect.any(PostgresSubdomainRegistry),
    ]);
  });
});
