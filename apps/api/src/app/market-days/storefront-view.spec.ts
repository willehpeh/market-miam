import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { InMemorySubdomainRegistry } from '@market-miam/market-days';
import { bootApiTestApp, testVendor } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

describe('Viewing a storefront over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the projected storefront view for the authenticated vendor', async () => {
    await request(app.getHttpServer())
      .post('/vendors')
      .set('Authorization', 'Bearer any-token')
      .expect(201);

    await app.get(Subscriptions).drain();

    const response = await request(app.getHttpServer())
      .get('/storefront')
      .set('Authorization', 'Bearer any-token')
      .expect(200);

    expect(response.body).toEqual({
      name: '',
      description: '',
      phone: '',
      imageReference: '',
      published: false,
      subdomain: null,
    });
  });

  it('includes the assigned subdomain for the authenticated vendor', async () => {
    await request(app.getHttpServer())
      .post('/vendors')
      .set('Authorization', 'Bearer any-token')
      .expect(201);
    await app.get(Subscriptions).drain();
    await app.get(InMemorySubdomainRegistry).register('chez-demo', testVendor.vendorId.value());

    const response = await request(app.getHttpServer())
      .get('/storefront')
      .set('Authorization', 'Bearer any-token')
      .expect(200);

    expect(response.body.subdomain).toBe('chez-demo');
  });

  it('returns 404 while the storefront has not yet been projected', async () => {
    await request(app.getHttpServer())
      .post('/vendors')
      .set('Authorization', 'Bearer any-token')
      .expect(201);

    await request(app.getHttpServer())
      .get('/storefront')
      .set('Authorization', 'Bearer any-token')
      .expect(404);
  });
});
