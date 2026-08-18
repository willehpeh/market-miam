import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EventStore } from '@market-miam/event-sourcing';
import { bootApiTestApp, fixedClock } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

// fixedClock is 2026-06-23T09:00Z — a Tuesday, 11:00 in Paris, mid-market for a 07:00–14:30 day.
const TUESDAY = '2026-06-23';
const NEXT_TUESDAY = '2026-06-30';

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

describe('Closing the stand over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
  });

  afterEach(async () => {
    await app.close();
  });

  const authed = (method: 'post' | 'put' | 'get', url: string) =>
    request(app.getHttpServer())[method](url).set('Authorization', 'Bearer any-token');

  const setClosed = (closed: boolean, date = TUESDAY) =>
    authed('put', `/market-days/market-1/${date}/closed`).send({ closed });

  async function seedToday(): Promise<void> {
    await authed('post', '/market-schedules').send(schedule).expect(201);
    await app.get(Subscriptions).drain();
  }

  const upcomingClosed = async () => {
    const response = await authed('get', '/market-days/upcoming').expect(200);
    return response.body.marketDays[0].closed;
  };

  it("closes the stand, serving it on the day's occurrence", async () => {
    await seedToday();

    await setClosed(true).expect(200);
    await app.get(Subscriptions).drain();

    expect(await upcomingClosed()).toBe(true);
  });

  // A phone retrying on market wifi must be safe — the reason this is one idempotent PUT
  // (decision 44), and a no-op in the domain (decision 36).
  it('answers a retried close with 200, recording it once', async () => {
    await seedToday();

    await setClosed(true).expect(200);
    await setClosed(true).expect(200);

    const events = await app.get(EventStore).load(`market-day/acme-bakery/market-1/${TUESDAY}`);
    expect(events.map(event => event.type)).toEqual(['MarketDayClosed']);
  });

  it('reopens the stand', async () => {
    await seedToday();
    await setClosed(true).expect(200);

    await setClosed(false).expect(200);
    await app.get(Subscriptions).drain();

    expect(await upcomingClosed()).toBe(false);
  });

  it('rejects a day that is not today as a bad request', async () => {
    await seedToday();

    await setClosed(true, NEXT_TUESDAY).expect(400);
  });

  // The aggregate holds the day's hours and refuses for itself: a market that finished at
  // 09:00 cannot be reopened at 11:00, though it stays the vendor's to look at.
  it('rejects reopening a market that has ended as a bad request', async () => {
    await authed('post', '/market-schedules')
      .send({ ...schedule, days: [{ day: 'TUE', startTime: '06:00', endTime: '09:00' }] })
      .expect(201);
    await app.get(Subscriptions).drain();
    await setClosed(true).expect(200);

    await setClosed(false).expect(400);
  });

  // The vendor keeps the day: the live screen reads it by market and date, so a stand
  // closed this morning is still there to look at once the market has ended.
  it('serves a closed day back after its market has ended', async () => {
    await authed('post', '/market-schedules')
      .send({ ...schedule, days: [{ day: 'TUE', startTime: '06:00', endTime: '09:00' }] })
      .expect(201);
    await app.get(Subscriptions).drain();
    await setClosed(true).expect(200);
    await app.get(Subscriptions).drain();

    const response = await authed('get', `/market-days/market-1/${TUESDAY}`).expect(200);
    expect(response.body).toMatchObject({ date: TUESDAY, closed: true, today: true });
  });

  it('404s for a day the vendor has no market scheduled on', async () => {
    await seedToday();

    await authed('get', `/market-days/market-1/${NEXT_TUESDAY.replace('06-30', '07-01')}`).expect(404);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .put(`/market-days/market-1/${TUESDAY}/closed`)
      .send({ closed: true })
      .expect(401);
    await request(app.getHttpServer())
      .get(`/market-days/market-1/${TUESDAY}`)
      .expect(401);
  });
});
