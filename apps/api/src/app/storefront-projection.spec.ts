import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Subscription } from '@market-monster/event-sourcing';
import { VendorStorefrontViews } from '@market-monster/market-days';
import { bootApiTestApp } from './testing/api-test-app';

describe('Storefront view projection', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
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
