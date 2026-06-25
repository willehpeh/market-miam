import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { Clock, Email, Instant, LocalDate } from '@market-monster/common';
import { VendorId } from '@market-monster/shared-kernel';
import { VerifiedVendor } from '@market-monster/auth';
import { AuthModule } from '@market-monster/auth-nestjs';
import { MarketDaysModule } from '../market-days.module';
import { POLLING_ENABLED } from '../consumer-runner';
import { FakeTokenVerifier } from './fake-token-verifier';

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
}

// The API test module: a fake verifier (any bearer token = the vendor) and an
// optional fixed clock. Returns the builder so a test that needs to can override
// further providers with Nest's native `.overrideProvider(...)` before starting.
export function apiTestModule(options: ApiTestOptions = {}): TestingModuleBuilder {
  const { vendor = testVendor, clock } = options;
  const builder = Test.createTestingModule({
    imports: [
      AuthModule.forRootAsync({ useFactory: () => new FakeTokenVerifier(vendor) }),
      MarketDaysModule,
    ],
  });
  // Tests pump ConsumerRunner.drain() deterministically — no background timer.
  builder.overrideProvider(POLLING_ENABLED).useValue(false);
  if (clock) {
    builder.overrideProvider(Clock).useValue(clock);
  }
  return builder;
}

// Compile a (possibly overridden) module and start the app.
export async function startApp(builder: TestingModuleBuilder): Promise<INestApplication> {
  const app = (await builder.compile()).createNestApplication();
  await app.init();
  return app;
}

// The common case: boot the standard API test app with no provider overrides.
export function bootApiTestApp(options: ApiTestOptions = {}): Promise<INestApplication> {
  return startApp(apiTestModule(options));
}
