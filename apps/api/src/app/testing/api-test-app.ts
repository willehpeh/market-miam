import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { Clock, Email, Instant, LocalDate } from '@market-monster/common';
import { VendorId } from '@market-monster/shared-kernel';
import { VerifiedVendor } from '@market-monster/auth';
import { AuthModule } from '@market-monster/auth-nestjs';
import { MarketDaysModule } from '../market-days.module';
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

export interface BootOptions {
  vendor?: VerifiedVendor;
  clock?: Clock;
  configure?: (builder: TestingModuleBuilder) => void;
}

// Boots the API behind a fake token verifier (any bearer token = the vendor).
// `clock` overrides the server clock; `configure` lets a test swap further
// providers (e.g. a failing EventStore) before the module compiles.
export async function bootApiTestApp(options: BootOptions = {}): Promise<INestApplication> {
  const { vendor = testVendor, clock, configure } = options;

  const builder = Test.createTestingModule({
    imports: [
      AuthModule.forRootAsync({ useFactory: () => new FakeTokenVerifier(vendor) }),
      MarketDaysModule,
    ],
  });

  if (clock) {
    builder.overrideProvider(Clock).useValue(clock);
  }
  configure?.(builder);

  const app = (await builder.compile()).createNestApplication();
  await app.init();
  return app;
}
