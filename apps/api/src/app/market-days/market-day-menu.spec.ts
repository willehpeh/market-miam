import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EventStore } from '@market-miam/event-sourcing';
import { InMemorySubdomainRegistry } from '@market-miam/market-days';
import { bootApiTestApp, fixedClock } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

// fixedClock is 2026-06-23T09:00Z — a Tuesday, 11:00 in Paris, mid-market for a 07:00–14:30 day.
const TUESDAY = '2026-06-23';

const dish = {
  itemId: 'item-1',
  name: 'Bœuf bourguignon',
  description: 'Mijoté maison',
  price: 1300,
  imageReference: 'v1/dishes/acme-bakery/item-1',
};

const schedule = {
  scheduleId: 'schedule-1',
  startDate: TUESDAY,
  market: {
    id: 'market-1',
    name: 'Marché de Belleville',
    streetAddress: 'Boulevard de Belleville',
    codePostal: '75011',
    town: 'Paris',
    pitch: 'B12',
  },
  days: [{ day: 'TUE', startTime: '07:00', endTime: '14:30' }],
  frequency: { weeks: 1 },
};

describe('Setting a market day\'s menu over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
  });

  afterEach(async () => {
    await app.close();
  });

  const authed = (method: 'post' | 'put' | 'get', url: string) =>
    request(app.getHttpServer())[method](url).set('Authorization', 'Bearer any-token');

  const setMenu = (itemIds: string[], marketId = 'market-1', date = TUESDAY) =>
    authed('put', `/market-days/${marketId}/${date}/menu`).send({ itemIds });

  async function seedCatalogueAndSchedule(): Promise<void> {
    await authed('post', '/catalogue').send(dish).expect(201);
    await authed('post', '/market-schedules').send(schedule).expect(201);
    await app.get(Subscriptions).drain();
  }

  // Context rather than subject, so seeded as events like public-storefront.spec does,
  // instead of driving four more routes.
  async function seedPublishedStorefront(): Promise<void> {
    await app.get(EventStore).append('storefront-acme-bakery', [
      { type: 'StorefrontOpened', payload: { vendorId: 'acme-bakery' }, version: 1 },
      { type: 'StorefrontInformationEdited', payload: { name: 'Acme Bakery', description: 'Fresh bread daily', phone: '0102030405' }, version: 1 },
      { type: 'StorefrontPublished', payload: {}, version: 1 },
    ], 0, { vendorId: 'acme-bakery' });
    await app.get(Subscriptions).drain();
    await app.get(InMemorySubdomainRegistry).register('acme', 'acme-bakery');
  }

  it('serves the menu back on the vendor\'s upcoming days', async () => {
    await seedCatalogueAndSchedule();

    await setMenu([dish.itemId]).expect(200);
    await app.get(Subscriptions).drain();

    const response = await authed('get', '/market-days/upcoming').expect(200);
    expect(response.body.marketDays[0]).toMatchObject({
      marketId: 'market-1',
      date: TUESDAY,
      dishes: [expect.objectContaining({ itemId: 'item-1', name: 'Bœuf bourguignon', price: 1300 })],
    });
  });

  // Born green — the customer path composes FindUpcomingMarketDaysHandler in process, so
  // this crosses no code the vendor assertion missed. Pinned because it is the reason the
  // slice exists: the menu is worthless until a customer standing at the market sees it.
  it('serves the same menu to a customer on the published storefront', async () => {
    await seedCatalogueAndSchedule();
    await seedPublishedStorefront();

    await setMenu([dish.itemId]).expect(200);
    await app.get(Subscriptions).drain();

    const response = await request(app.getHttpServer()).get('/public/storefront/acme').expect(200);
    expect(response.body.upcomingMarkets[0]).toMatchObject({
      date: TUESDAY,
      inProgress: true,
      dishes: [expect.objectContaining({ itemId: 'item-1', name: 'Bœuf bourguignon' })],
    });
  });

  it('rejects a dish the vendor does not have as a bad request', async () => {
    await seedCatalogueAndSchedule();

    await setMenu(['never-in-the-catalogue']).expect(400);
  });
});
