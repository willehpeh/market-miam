import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { InMemorySubdomainRegistry } from '@market-miam/market-days';
import { bootApiTestApp } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

describe('Public storefront', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  const openStorefront = async (info: { name: string; description: string; phone: string }): Promise<void> => {
    await request(app.getHttpServer()).post('/vendors').set('Authorization', 'Bearer any-token').expect(201);
    await app.get(Subscriptions).drain();
    await request(app.getHttpServer()).put('/storefront').set('Authorization', 'Bearer any-token').send(info).expect(200);
    await app.get(Subscriptions).drain();
  };

  it('returns the storefront for a resolved subdomain', async () => {
    await openStorefront({ name: 'Acme Bakery', description: 'Fresh bread daily', phone: '0102030405' });
    await app.get(InMemorySubdomainRegistry).register('acme', 'acme-bakery');

    const res = await request(app.getHttpServer()).get('/public/storefront/acme').expect(200);
    expect(res.body).toEqual({
      name: 'Acme Bakery',
      description: 'Fresh bread daily',
      phone: '0102030405',
      coverPhoto: null,
    });
  });

  it('404s for an unresolved subdomain', async () => {
    await request(app.getHttpServer()).get('/public/storefront/unknown').expect(404);
  });

  it('exposes the cover photo reference when one is set', async () => {
    await openStorefront({ name: 'Acme Bakery', description: 'Fresh bread daily', phone: '0102030405' });
    await request(app.getHttpServer())
      .put('/storefront/cover-photo')
      .set('Authorization', 'Bearer any-token')
      .send({ version: 7 })
      .expect(200);
    await app.get(Subscriptions).drain();
    await app.get(InMemorySubdomainRegistry).register('acme', 'acme-bakery');

    const res = await request(app.getHttpServer()).get('/public/storefront/acme').expect(200);
    expect(res.body.coverPhoto).toBe('v7/vendors/acme-bakery/storefront/cover-photo');
  });

  it('404s when the subdomain resolves to a vendor with no storefront', async () => {
    await app.get(InMemorySubdomainRegistry).register('ghost', 'ghost-vendor');
    await request(app.getHttpServer()).get('/public/storefront/ghost').expect(404);
  });
});
