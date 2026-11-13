import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { Clock, Email, Instant, LocalDate } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { EventStore } from '@market-miam/event-sourcing';
import { InMemoryVendorAccounts, StorefrontOpened, vendorPiiFields, vendorPiiKeyScopes, VendorAccounts } from '@market-miam/market-days';
import { StaticTokenVerifier, type VerifiedVendor } from '@market-miam/auth';
import { AuthModule, OperatorAuthModule } from '@market-miam/auth-nestjs';
import { MarketDaysModule } from '../market-days/market-days.module';
import { OpsModule } from '../ops/ops.module';
import { FakeOperatorTokenVerifier } from './fake-operator-token-verifier';
import { Account, Accounts } from '../ops/accounts/accounts';
import { FakeAccounts } from './fake-accounts';
import { DevelopmentAccountsModule } from '../ops/accounts/development-accounts.module';
import { EventSourcingModule } from '../event-sourcing/event-sourcing.module';
import { InMemoryPersistenceModule } from '../persistence/in-memory-persistence.module';
import { globalFilters } from '../global-filters';
import { PollSchedule } from '../event-sourcing/poll-schedule';
import { FakeSignedUploads, SignedUploads } from '../signed-uploads';

export const testVendor: VerifiedVendor = {
  vendorId: new VendorId('acme-bakery'),
  email: new Email('owner@acme.test'),
};

export const FIXED_NOW = '2026-06-23T09:00:00.000Z';

export const fixedClock: Clock = {
  today: () => new LocalDate('2026-06-23'),
  now: () => new Instant(FIXED_NOW),
};

export interface ApiTestOptions {
  vendor?: VerifiedVendor;
  clock?: Clock;
  signer?: SignedUploads;
  // 'disabled' (default): tests drive projections explicitly via drain().
  // 'live': keep the profile's real poke-driven polling — for tests of that wiring.
  polling?: 'live' | 'disabled';
  // The identity provider's accounts, as the operator API lists them.
  accounts?: Account[];
  // Vendors' sign-in accounts, as the invitation processor opens them.
  vendorAccounts?: InMemoryVendorAccounts;
}

export function apiTestModule(options: ApiTestOptions = {}): TestingModuleBuilder {
  const {
    vendor = testVendor,
    clock,
    signer = new FakeSignedUploads(),
    polling = 'disabled',
    accounts = [],
    vendorAccounts = new InMemoryVendorAccounts(),
  } = options;
  const builder = Test.createTestingModule({
    imports: [
      AuthModule.forRootAsync({ useFactory: () => new StaticTokenVerifier(vendor) }),
      OperatorAuthModule.forRootAsync({ useFactory: () => new FakeOperatorTokenVerifier() }),
      InMemoryPersistenceModule,
      DevelopmentAccountsModule,
      EventSourcingModule.forRoot(vendorPiiFields, vendorPiiKeyScopes),
      MarketDaysModule,
      OpsModule,
    ],
    providers: [...globalFilters],
  });
  if (polling === 'disabled') {
    builder.overrideProvider(PollSchedule).useValue(PollSchedule.never());
  }
  builder.overrideProvider(SignedUploads).useValue(signer);
  builder.overrideProvider(Accounts).useValue(new FakeAccounts(accounts));
  builder.overrideProvider(VendorAccounts).useValue(vendorAccounts);
  if (clock) {
    builder.overrideProvider(Clock).useValue(clock);
  }
  return builder;
}

export async function startApp(builder: TestingModuleBuilder): Promise<INestApplication> {
  const app = (await builder.compile()).createNestApplication();
  await app.init();
  return app;
}

export function bootApiTestApp(options: ApiTestOptions = {}): Promise<INestApplication> {
  return startApp(apiTestModule(options));
}

export async function openStorefrontFor(app: INestApplication, vendorId: string): Promise<void> {
  const opened: StorefrontOpened = { type: 'StorefrontOpened', payload: { vendorId }, version: 1 };
  const store = app.get(EventStore);
  await store.append(`storefront-${vendorId}`, [opened], 0, { vendorId });
}
