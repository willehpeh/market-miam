import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Clock, Email, Instant, LocalDate } from '@market-monster/common';
import { VendorId } from '@market-monster/shared-kernel';
import { TokenVerifier, VerifiedVendor } from '@market-monster/auth';
import { AuthModule } from '@market-monster/auth-nestjs';
import { EventStore } from '@market-monster/event-sourcing';
import { MarketDaysModule } from './market-days.module';

class FakeTokenVerifier extends TokenVerifier {
  constructor(private readonly vendor: VerifiedVendor) {
    super();
  }

  verify(): Promise<VerifiedVendor> {
    return Promise.resolve(this.vendor);
  }
}

const REGISTERED_AT = '2026-06-23T09:00:00.000Z';

const fixedClock: Clock = {
  today: () => new LocalDate('2026-06-23'),
  now: () => new Instant(REGISTERED_AT),
};

describe('Vendor registration over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const vendor: VerifiedVendor = {
      vendorId: new VendorId('acme-bakery'),
      email: new Email('owner@acme.test'),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        AuthModule.forRootAsync({ useFactory: () => new FakeTokenVerifier(vendor) }),
        MarketDaysModule,
      ],
    })
      .overrideProvider(Clock)
      .useValue(fixedClock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('registers the authenticated vendor, stamping correlation and causation lineage', async () => {
    await request(app.getHttpServer())
      .post('/vendors')
      .set('Authorization', 'Bearer any-token')
      .expect(201);

    const events = await app.get(EventStore).load('vendor-acme-bakery');

    expect(events).toEqual([
      expect.objectContaining({
        type: 'VendorRegistered',
        payload: {
          vendorId: 'acme-bakery',
          registeredAt: REGISTERED_AT,
          email: 'owner@acme.test',
        },
        metadata: expect.objectContaining({
          vendorId: 'acme-bakery',
          correlationId: expect.any(String),
          causationId: expect.any(String),
        }),
      }),
    ]);
  });
});
