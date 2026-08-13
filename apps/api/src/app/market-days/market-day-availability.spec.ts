import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp, fixedClock } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

// fixedClock is 2026-06-23T09:00Z — a Tuesday, 11:00 in Paris, mid-market for a 07:00–14:30 day.
const TUESDAY = '2026-06-23';
const NEXT_TUESDAY = '2026-06-30';

const item = {
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

describe("Changing an item's availability over HTTP", () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
  });

  afterEach(async () => {
    await app.close();
  });

  const authed = (method: 'post' | 'put' | 'get', url: string) =>
    request(app.getHttpServer())[method](url).set('Authorization', 'Bearer any-token');

  const availability = (itemId: string, soldOut: boolean, date = TUESDAY) =>
    authed('put', `/market-days/market-1/${date}/items/${itemId}/availability`).send({ soldOut });

  async function seedTodayPlanned(): Promise<void> {
    await authed('post', '/catalogue').send(item).expect(201);
    await authed('post', '/market-schedules').send(schedule).expect(201);
    await authed('put', `/market-days/market-1/${TUESDAY}/menu`).send({ itemIds: [item.itemId] }).expect(200);
    await app.get(Subscriptions).drain();
  }

  const upcomingSoldOut = async () => {
    const response = await authed('get', '/market-days/upcoming').expect(200);
    return response.body.marketDays[0].soldOutItemIds;
  };

  it("marks an item sold out, serving it in the day's soldOutItemIds", async () => {
    await seedTodayPlanned();

    await availability(item.itemId, true).expect(200);
    await app.get(Subscriptions).drain();

    expect(await upcomingSoldOut()).toEqual(['item-1']);
  });

  it('marks the item available again', async () => {
    await seedTodayPlanned();
    await availability(item.itemId, true).expect(200);

    await availability(item.itemId, false).expect(200);
    await app.get(Subscriptions).drain();

    expect(await upcomingSoldOut()).toEqual([]);
  });

  // A phone retrying on market wifi must be safe — the reason this is one idempotent PUT
  // rather than POST + DELETE (decision 19), and a no-op in the domain (decision 36).
  it('answers a retried mark with 200, recording it once', async () => {
    await seedTodayPlanned();

    await availability(item.itemId, true).expect(200);
    await availability(item.itemId, true).expect(200);
    await app.get(Subscriptions).drain();

    expect(await upcomingSoldOut()).toEqual(['item-1']);
  });

  it('rejects a day that is not today as a bad request', async () => {
    await seedTodayPlanned();

    await availability(item.itemId, true, NEXT_TUESDAY).expect(400);
  });

  it("rejects an item that is not on today's menu as a bad request", async () => {
    await seedTodayPlanned();

    await availability('never-planned', true).expect(400);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .put(`/market-days/market-1/${TUESDAY}/items/item-1/availability`)
      .send({ soldOut: true })
      .expect(401);
  });
});
