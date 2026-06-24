import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Email } from '@market-monster/common';
import { VendorId } from '@market-monster/shared-kernel';
import { VerifiedVendor } from '@market-monster/auth';
import { FakeTokenVerifier } from './testing/fake-token-verifier';
import { AuthModule } from '@market-monster/auth-nestjs';
import { EventStore } from '@market-monster/event-sourcing';
import { MarketDaysModule } from './market-days.module';

describe('Editing storefront information over HTTP', () => {
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
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('records the edited storefront information for the authenticated vendor', async () => {
    await request(app.getHttpServer())
      .put('/storefront')
      .set('Authorization', 'Bearer any-token')
      .send({ name: 'Acme Bakery', description: 'Fresh bread daily' })
      .expect(200);

    const events = await app.get(EventStore).load('storefront-acme-bakery');

    expect(events).toEqual([
      expect.objectContaining({
        type: 'StorefrontInformationEdited',
        payload: { name: 'Acme Bakery', description: 'Fresh bread daily' },
        metadata: expect.objectContaining({
          vendorId: 'acme-bakery',
          correlationId: expect.any(String),
          causationId: expect.any(String),
        }),
      }),
    ]);
  });
});
