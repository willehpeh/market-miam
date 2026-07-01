import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { Clock, Email, Instant, LocalDate } from '@market-monster/common';
import { VendorId } from '@market-monster/shared-kernel';
import { EventStore } from '@market-monster/event-sourcing';
import { StorefrontOpened } from '@market-monster/market-days';
import { StaticTokenVerifier, VerifiedVendor } from '@market-monster/auth';
import { AuthModule } from '@market-monster/auth-nestjs';
import { MarketDaysModule } from '../market-days/market-days.module';
import { POLLING_ENABLED } from '../event-sourcing/consumer-runner';

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

export function apiTestModule(options: ApiTestOptions = {}): TestingModuleBuilder {
  const { vendor = testVendor, clock } = options;
  const builder = Test.createTestingModule({
    imports: [
      AuthModule.forRootAsync({ useFactory: () => new StaticTokenVerifier(vendor) }),
      MarketDaysModule,
    ],
  });
  builder.overrideProvider(POLLING_ENABLED).useValue(false);
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
  const opened: StorefrontOpened = { type: 'StorefrontOpened', payload: { vendorId } };
  await app.get(EventStore).append(`storefront-${vendorId}`, [opened], 0, { vendorId });
}
