import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EventStore } from '@market-miam/event-sourcing';
import { InMemorySubdomainRegistry } from '@market-miam/market-days';
import { bootApiTestApp, openStorefrontFor } from '../testing/api-test-app';

describe('Publishing a storefront over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects publishing an unready storefront as a bad request naming what is missing', async () => {
    await openStorefrontFor(app, 'acme-bakery');

    const response = await request(app.getHttpServer())
      .post('/storefront/publish')
      .set('Authorization', 'Bearer any-token')
      .expect(400);

    expect(response.body.message).toContain('catalogue');
  });

  it('rejects publishing a storefront with no assigned subdomain', async () => {
    await readyStorefrontFor(app, 'acme-bakery');

    const response = await request(app.getHttpServer())
      .post('/storefront/publish')
      .set('Authorization', 'Bearer any-token')
      .expect(400);

    expect(response.body.message).toContain('url');
  });

  it('publishes a storefront that meets every requirement', async () => {
    await readyStorefrontFor(app, 'acme-bakery');
    await app.get(InMemorySubdomainRegistry).register('acme', 'acme-bakery');

    await request(app.getHttpServer())
      .post('/storefront/publish')
      .set('Authorization', 'Bearer any-token')
      .expect(204);
  });

  async function readyStorefrontFor(app: INestApplication, vendorId: string): Promise<void> {
    const store = app.get(EventStore);
    await store.append(`storefront-${vendorId}`, [
      { type: 'StorefrontOpened', payload: { vendorId }, version: 1 },
      { type: 'StorefrontInformationEdited', payload: { name: 'Chez Demo', description: 'Cuisine maison', phone: '0102030405' }, version: 1 },
      { type: 'StorefrontCoverPhotoSet', payload: { imageReference: 'v1/cover' }, version: 1 },
    ], 0, { vendorId });
    await store.append(`catalogue-${vendorId}`, [
      { type: 'ItemAddedToCatalogue', payload: { itemId: 'dish-1', name: 'Bœuf bourguignon', description: 'Mijoté', price: 1300 }, version: 1 },
    ], 0, { vendorId });
    await store.append(`calendar-${vendorId}`, [
      { type: 'MarketScheduleRegistered', payload: { scheduleId: 'sched-1', market: { id: 'market-1' } }, version: 1 },
    ], 0, { vendorId });
  }
});
