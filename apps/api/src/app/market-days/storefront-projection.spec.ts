import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { VendorStorefrontViews } from '@market-miam/market-days';
import { bootApiTestApp, openStorefrontFor } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

describe('Storefront view projection', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('projects edited storefront information into the read model once polled', async () => {
    await openStorefrontFor(app, 'acme-bakery');

    await request(app.getHttpServer())
      .put('/storefront')
      .set('Authorization', 'Bearer any-token')
      .send({ name: 'Acme Bakery', description: 'Fresh bread daily' })
      .expect(200);

    await app.get(Subscriptions).drain();

    const view = await app.get(VendorStorefrontViews).findByVendor('acme-bakery');

    expect(view).toEqual({
      name: 'Acme Bakery',
      description: 'Fresh bread daily',
      phone: '',
      imageReference: '',
    });
  });
});
