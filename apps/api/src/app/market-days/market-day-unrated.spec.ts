import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp, fixedClock } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

// fixedClock is 2026-06-23T09:00Z — a Tuesday, 11:00 in Paris, mid-market for a 07:00–14:30
// day. The prompt asks about finished markets, so these close the stand to finish it.
const TUESDAY = '2026-06-23';

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

describe('Reading the unrated market days over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
  });

  afterEach(async () => {
    await app.close();
  });

  const authed = (method: 'post' | 'put' | 'get', url: string) =>
    request(app.getHttpServer())[method](url).set('Authorization', 'Bearer any-token');

  const unrated = async () => (await authed('get', '/market-days/unrated').expect(200)).body.marketDays;

  async function seedTradingDay(): Promise<void> {
    await authed('post', '/catalogue').send(item).expect(201);
    await authed('post', '/market-schedules').send(schedule).expect(201);
    await authed('put', `/market-days/market-1/${TUESDAY}/menu`).send({ itemIds: [item.itemId] }).expect(200);
    await app.get(Subscriptions).drain();
  }

  // Decision 65: the upcoming list drops a day at endTime, so a finished market is in no
  // list the vendor's app reads — the prompt is the only thing that will ask about it.
  it('names a finished day nobody has judged, and what to call it', async () => {
    await seedTradingDay();
    await authed('put', `/market-days/market-1/${TUESDAY}/closed`).send({ closed: true }).expect(200);
    await app.get(Subscriptions).drain();

    expect(await unrated()).toEqual([
      { marketId: 'market-1', date: TUESDAY, day: 'TUE', marketName: 'Marché de Belleville' },
    ]);
  });

  it('says nothing about a market still being traded', async () => {
    await seedTradingDay();

    expect(await unrated()).toEqual([]);
  });

  it('stops asking once the bilan is recorded', async () => {
    await seedTradingDay();
    await authed('put', `/market-days/market-1/${TUESDAY}/closed`).send({ closed: true }).expect(200);
    await authed('put', `/market-days/market-1/${TUESDAY}/bilan`).send({ outcomes: { 'item-1': 'did_well' } }).expect(200);
    await app.get(Subscriptions).drain();

    expect(await unrated()).toEqual([]);
  });

  it('turns a signed-out request away', async () => {
    await request(app.getHttpServer()).get('/market-days/unrated').expect(401);
  });
});
