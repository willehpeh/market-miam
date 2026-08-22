import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp, fixedClock } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

// fixedClock is 2026-06-23T09:00Z — a Tuesday, 11:00 in Paris, mid-market for a 07:00–14:30
// day. A bilan needs a finished day, so this closes the stand first, exactly as
// market-day-bilan.spec.ts does.
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
  market: { id: 'market-1', name: 'Marché de Belleville', codePostal: '75011', town: 'Paris' },
  days: [{ day: 'TUE', startTime: '07:00', endTime: '14:30' }],
  frequency: { weeks: 1 },
};

describe('Reading what sells over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
  });

  afterEach(async () => {
    await app.close();
  });

  const authed = (method: 'post' | 'put' | 'get', url: string) =>
    request(app.getHttpServer())[method](url).set('Authorization', 'Bearer any-token');

  // One judged day, not several. A second, older bilan cannot be reached through the API at
  // all: setMenu refuses a past day (MarketDayInThePastError), so a vendor's history only
  // ever accrues in real time. Which is fine here — the fold across dates is
  // find-selling-record.spec.ts's job, and this spec's is the route, its guard, its wiring
  // and the shape it answers with.
  async function judgedToday(outcome: string): Promise<void> {
    await authed('put', `/market-days/market-1/${TUESDAY}/menu`).send({ itemIds: [item.itemId] }).expect(200);
    await authed('put', `/market-days/market-1/${TUESDAY}/closed`).send({ closed: true }).expect(200);
    await authed('put', `/market-days/market-1/${TUESDAY}/bilan`).send({ outcomes: { [item.itemId]: outcome } }).expect(200);
    await app.get(Subscriptions).drain();
  }

  it('serves back what the vendor said about a dish at a market', async () => {
    await authed('post', '/catalogue').send(item).expect(201);
    await authed('post', '/market-schedules').send(schedule).expect(201);
    await app.get(Subscriptions).drain();
    await judgedToday('sold_out');

    const { body } = await authed('get', '/selling-record').expect(200);

    expect(body).toEqual({
      markets: [
        {
          marketId: 'market-1',
          items: [
            {
              itemId: 'item-1',
              bilans: [{ date: TUESDAY, outcome: 'sold_out' }],
            },
          ],
        },
      ],
    });
  });

  it('reads an empty set before any bilan is recorded', async () => {
    const { body } = await authed('get', '/selling-record').expect(200);

    expect(body).toEqual({ markets: [] });
  });

  it('refuses an unauthenticated read', async () => {
    await request(app.getHttpServer()).get('/selling-record').expect(401);
  });
});
