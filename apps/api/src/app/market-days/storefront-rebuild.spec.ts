import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { VendorStorefrontViews, VendorStorefrontViewStore } from '@market-miam/market-days';
import { bootApiTestApp } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

describe('Rebuilding the storefront projection', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('clears the read model and replays it from the event log', async () => {
    // acme-bakery is the authenticated vendor; register + edit builds its view.
    await request(app.getHttpServer())
      .post('/vendors')
      .set('Authorization', 'Bearer any-token')
      .expect(201);
    await app.get(Subscriptions).drain();

    await request(app.getHttpServer())
      .put('/storefront')
      .set('Authorization', 'Bearer any-token')
      .send({ name: 'Acme Bakery', description: 'Fresh bread daily', phone: '0102030405' })
      .expect(200);
    await app.get(Subscriptions).drain();

    // An orphan row with no backing events — only a real clear removes it, since
    // replay never recreates it. This is what distinguishes clear+replay from a no-op.
    await app.get(VendorStorefrontViewStore).editInformation('ghost-vendor', {
      name: 'Ghost',
      description: 'no events',
      phone: '',
    });

    await app.get(Subscriptions).rebuild('vendor-storefront-view');

    const rebuilt = await request(app.getHttpServer())
      .get('/storefront')
      .set('Authorization', 'Bearer any-token')
      .expect(200);
    expect(rebuilt.body).toEqual({
      name: 'Acme Bakery',
      description: 'Fresh bread daily',
      phone: '0102030405',
      imageReference: '',
    });
    expect(await app.get(VendorStorefrontViews).findByVendor('ghost-vendor')).toBeUndefined();
  });
});
