import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EventStore } from '@market-miam/event-sourcing';
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

  const opened = { type: 'StorefrontOpened', payload: { vendorId: 'acme-bakery' }, version: 1 };
  const infoEdited = { type: 'StorefrontInformationEdited', payload: { name: 'Acme Bakery', description: 'Fresh bread daily', phone: '0102030405' }, version: 1 };
  const coverSet = { type: 'StorefrontCoverPhotoSet', payload: { imageReference: 'v7/cover' }, version: 1 };
  const published = { type: 'StorefrontPublished', payload: {}, version: 1 };

  async function seedStorefront(events: object[], subdomain = 'acme'): Promise<void> {
    await app.get(EventStore).append('storefront-acme-bakery', events, 0, { vendorId: 'acme-bakery' });
    await app.get(Subscriptions).drain();
    await app.get(InMemorySubdomainRegistry).register(subdomain, 'acme-bakery');
  }

  it('returns the published storefront for a resolved subdomain', async () => {
    await seedStorefront([opened, infoEdited, coverSet, published]);

    const res = await request(app.getHttpServer()).get('/public/storefront/acme').expect(200);
    expect(res.body).toEqual({
      status: 'published',
      name: 'Acme Bakery',
      description: 'Fresh bread daily',
      phone: '0102030405',
      coverPhoto: 'v7/cover',
    });
  });

  it('returns coming-soon, keeping the title, for a resolved but unpublished storefront', async () => {
    await seedStorefront([opened, infoEdited]);

    const res = await request(app.getHttpServer()).get('/public/storefront/acme').expect(200);
    expect(res.body).toEqual({ status: 'coming-soon', name: 'Acme Bakery' });
  });

  it('returns coming-soon with no title when the subdomain resolves to a vendor with no storefront', async () => {
    await app.get(InMemorySubdomainRegistry).register('ghost', 'ghost-vendor');

    const res = await request(app.getHttpServer()).get('/public/storefront/ghost').expect(200);
    expect(res.body).toEqual({ status: 'coming-soon', name: null });
  });

  it('404s for an unresolved subdomain', async () => {
    await request(app.getHttpServer()).get('/public/storefront/unknown').expect(404);
  });
});
