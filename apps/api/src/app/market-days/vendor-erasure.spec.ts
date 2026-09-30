import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataKeys, SHREDDED } from '@market-miam/event-sourcing';
import {
  InMemorySubdomainRegistry,
  VendorStorefrontViews,
  VendorStorefrontViewStore,
} from '@market-miam/market-days';
import { bootApiTestApp } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';
import { VendorErasure } from './vendor-erasure';

describe('Erasing a vendor', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('shreds the key and rebuilds the read model with the sentinel', async () => {
    // acme-bakery is the authenticated vendor; register + edit lands plaintext PII
    // (name/description/phone) in the storefront view.
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

    // A row with no backing events. The erased vendor's own row would come back as
    // the sentinel either way — editInformation is last-write-wins, so the replay
    // overwrites it whether or not the projection cleared first. Only a row replay
    // cannot recreate proves the clear actually ran, so this is what makes the
    // assertion below depend on the erasure mechanism rather than on overwriting.
    await app.get(VendorStorefrontViewStore).editInformation('ghost-vendor', {
      name: 'Ghost',
      description: 'no events',
      phone: '',
    });

    await app.get(VendorErasure).erase('acme-bakery');

    // The key is gone, so replay decrypts the PII fields to the sentinel.
    expect(await app.get(DataKeys).findKeyFor('acme-bakery')).toBeNull();
    expect(await app.get(VendorStorefrontViews).findByVendor('ghost-vendor')).toBeUndefined();

    const view = await request(app.getHttpServer())
      .get('/storefront')
      .set('Authorization', 'Bearer any-token')
      .expect(200);
    expect(view.body).toEqual({
      name: SHREDDED,
      description: SHREDDED,
      phone: SHREDDED,
      imageReference: '',
      published: false,
      cartePricesVisible: true,
      subdomain: null,
    });
  });

  it("removes the vendor's public storefront", async () => {
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

    await app.get(InMemorySubdomainRegistry).register('acme', 'acme-bakery');
    await request(app.getHttpServer()).get('/public/storefront/acme').expect(200);

    await app.get(VendorErasure).erase('acme-bakery');

    await request(app.getHttpServer()).get('/public/storefront/acme').expect(404);
  });
});
