import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DomainEvent, EventStore } from '@market-miam/event-sourcing';
import { InMemorySubdomainRegistry } from '@market-miam/market-days';
import { bootApiTestApp, fixedClock } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

describe('Public storefront', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
  });

  afterEach(async () => {
    await app.close();
  });

  const opened = { type: 'StorefrontOpened', payload: { vendorId: 'acme-bakery' }, version: 1 };
  const infoEdited = { type: 'StorefrontInformationEdited', payload: { name: 'Acme Bakery', description: 'Fresh bread daily', phone: '0102030405' }, version: 1 };
  const coverSet = { type: 'StorefrontCoverPhotoSet', payload: { imageReference: 'v7/cover' }, version: 1 };
  const published = { type: 'StorefrontPublished', payload: {}, version: 1 };
  // Weekly Tuesday market starting today (fixedClock = 2026-06-23, a Tuesday).
  const scheduleRegistered = {
    type: 'MarketScheduleRegistered',
    payload: {
      scheduleId: 'schedule-1',
      startDate: '2026-06-23',
      market: { id: 'market-1', name: 'Marché de Belleville', streetAddress: 'Boulevard de Belleville', codePostal: '75011', town: 'Paris', pitch: 'B12' },
      days: [{ day: 'TUE', startTime: '07:00', endTime: '14:30' }],
      frequency: { weeks: 1 },
    },
    version: 1,
  };

  async function seedStorefront(events: DomainEvent[], subdomain = 'acme'): Promise<void> {
    await app.get(EventStore).append('storefront-acme-bakery', events, 0, { vendorId: 'acme-bakery' });
    await app.get(Subscriptions).drain();
    await app.get(InMemorySubdomainRegistry).register(subdomain, 'acme-bakery');
  }

  async function seedCatalogue(events: DomainEvent[]): Promise<void> {
    await app.get(EventStore).append('catalogue-acme-bakery', events, 0, { vendorId: 'acme-bakery' });
    await app.get(Subscriptions).drain();
  }

  async function seedSchedule(events: DomainEvent[]): Promise<void> {
    await app.get(EventStore).append('calendar-acme-bakery', events, 0, { vendorId: 'acme-bakery' });
    await app.get(Subscriptions).drain();
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
      dishes: [],
      upcomingMarkets: [],
    });
  });

  it('includes the upcoming market days, dropping today\'s already-started market, keeping the first five', async () => {
    await seedStorefront([opened, infoEdited, coverSet, published]);
    await seedSchedule([scheduleRegistered]);

    const res = await request(app.getHttpServer()).get('/public/storefront/acme').expect(200);
    expect(res.body.upcomingMarkets.map((m: { date: string }) => m.date)).toEqual([
      '2026-06-30', '2026-07-07', '2026-07-14', '2026-07-21', '2026-07-28',
    ]);
    expect(res.body.upcomingMarkets[0]).toEqual({
      date: '2026-06-30', weekday: 'TUE', marketName: 'Marché de Belleville',
      startTime: '07:00', endTime: '14:30',
      street: 'Boulevard de Belleville', postalCode: '75011', town: 'Paris', pitch: 'B12',
      cancelled: false,
    });
  });

  it('keeps a market day the vendor declared absent from, flagged as cancelled', async () => {
    await seedStorefront([opened, infoEdited, coverSet, published]);
    await seedSchedule([
      scheduleRegistered,
      { type: 'AbsenceDeclared', payload: { scheduleId: 'schedule-1', from: '2026-06-30', to: '2026-06-30' }, version: 1 },
    ]);

    const res = await request(app.getHttpServer()).get('/public/storefront/acme').expect(200);
    expect(res.body.upcomingMarkets.map((m: { date: string; cancelled: boolean }) => [m.date, m.cancelled])).toEqual([
      ['2026-06-30', true], ['2026-07-07', false], ['2026-07-14', false], ['2026-07-21', false], ['2026-07-28', false],
    ]);
  });

  it('includes the catalogue dishes on a published storefront', async () => {
    await seedStorefront([opened, infoEdited, coverSet, published]);
    await seedCatalogue([
      { type: 'ItemAddedToCatalogue', payload: { itemId: 'dish-1', name: 'Bœuf bourguignon', description: 'Mijoté 7 heures', price: 1300, imageReference: 'v7/dish-1' }, version: 1 },
      { type: 'ItemAddedToCatalogue', payload: { itemId: 'dish-2', name: 'Tarte tatin', description: 'Aux pommes', price: 600 }, version: 1 },
    ]);

    const res = await request(app.getHttpServer()).get('/public/storefront/acme').expect(200);
    expect(res.body.dishes).toEqual([
      { itemId: 'dish-1', name: 'Bœuf bourguignon', description: 'Mijoté 7 heures', price: 1300, imageReference: 'v7/dish-1' },
      { itemId: 'dish-2', name: 'Tarte tatin', description: 'Aux pommes', price: 600, imageReference: '' },
    ]);
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
