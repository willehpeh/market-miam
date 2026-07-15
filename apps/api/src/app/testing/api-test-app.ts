import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { Clock, Email, Instant, LocalDate } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { EventStore } from '@market-miam/event-sourcing';
import { StorefrontOpened, vendorPiiFields } from '@market-miam/market-days';
import { StaticTokenVerifier, type VerifiedVendor } from '@market-miam/auth';
import { AuthModule } from '@market-miam/auth-nestjs';
import { MarketDaysModule } from '../market-days/market-days.module';
import { EventSourcingModule } from '../event-sourcing/event-sourcing.module';
import { DomainErrorFilter } from '../domain-error.filter';
import { POLLING_ENABLED } from '../event-sourcing/subscriptions';
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
}

export function apiTestModule(options: ApiTestOptions = {}): TestingModuleBuilder {
  const { vendor = testVendor, clock, signer = new FakeSignedUploads() } = options;
  const builder = Test.createTestingModule({
    imports: [
      AuthModule.forRootAsync({ useFactory: () => new StaticTokenVerifier(vendor) }),
      EventSourcingModule.forRoot('memory', vendorPiiFields),
      MarketDaysModule.forRoot('memory'),
    ],
    providers: [{ provide: APP_FILTER, useClass: DomainErrorFilter }],
  });
  builder.overrideProvider(POLLING_ENABLED).useValue(false);
  builder.overrideProvider(SignedUploads).useValue(signer);
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
