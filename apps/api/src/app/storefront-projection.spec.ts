import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Email } from '@market-monster/common';
import { VendorId } from '@market-monster/shared-kernel';
import { VerifiedVendor } from '@market-monster/auth';
import { FakeTokenVerifier } from './testing/fake-token-verifier';
import { AuthModule } from '@market-monster/auth-nestjs';
import { Subscription } from '@market-monster/event-sourcing';
import { VendorStorefrontViews } from '@market-monster/market-days';
import { MarketDaysModule } from './market-days.module';

describe('Storefront view projection', () => {
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

  it('projects edited storefront information into the read model once polled', async () => {
    await request(app.getHttpServer())
      .put('/storefront')
      .set('Authorization', 'Bearer any-token')
      .send({ name: 'Acme Bakery', description: 'Fresh bread daily' })
      .expect(200);

    await app.get(Subscription).poll();

    const view = await app.get(VendorStorefrontViews).findOrCreateForVendor('acme-bakery');

    expect(view).toEqual({
      name: 'Acme Bakery',
      description: 'Fresh bread daily',
      imageReference: '',
    });
  });
});
