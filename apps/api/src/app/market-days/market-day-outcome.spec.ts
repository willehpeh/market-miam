import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp, fixedClock } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

// fixedClock is 2026-06-23T09:00Z — a Tuesday, 11:00 in Paris, mid-market for a 07:00–14:30
// day. The bilan needs a day that is finished, so these close the stand first.
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

describe('Recording the bilan over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
  });

  afterEach(async () => {
    await app.close();
  });

  const authed = (method: 'post' | 'put' | 'get', url: string) =>
    request(app.getHttpServer())[method](url).set('Authorization', 'Bearer any-token');

  const outcome = (itemId: string, outcome: string, date = TUESDAY) =>
    authed('put', `/market-days/market-1/${date}/items/${itemId}/outcome`).send({ outcome });

  async function seedClosedDay(): Promise<void> {
    await authed('post', '/catalogue').send(item).expect(201);
    await authed('post', '/market-schedules').send(schedule).expect(201);
    await authed('put', `/market-days/market-1/${TUESDAY}/menu`).send({ itemIds: [item.itemId] }).expect(200);
    await authed('put', `/market-days/market-1/${TUESDAY}/closed`).send({ closed: true }).expect(200);
    await app.get(Subscriptions).drain();
  }

  const upcomingOutcomes = async () => {
    const response = await authed('get', '/market-days/upcoming').expect(200);
    return response.body.marketDays[0].outcomes;
  };

  it("records how a dish sold, serving it in the day's outcomes", async () => {
    await seedClosedDay();

    await outcome(item.itemId, 'did_well').expect(200);
    await app.get(Subscriptions).drain();

    expect(await upcomingOutcomes()).toEqual({ 'item-1': 'did_well' });
  });

  // A phone retrying in a van with one bar must be safe — the reason this is one
  // idempotent PUT (decision 19), and a no-op in the domain (decision 66).
  it('answers a retried answer with 200, recording it once', async () => {
    await seedClosedDay();

    await outcome(item.itemId, 'did_well').expect(200);
    await outcome(item.itemId, 'did_well').expect(200);
    await app.get(Subscriptions).drain();

    expect(await upcomingOutcomes()).toEqual({ 'item-1': 'did_well' });
  });

  // Overridable, in decision 49's sense: the vendor correcting themselves is the case the
  // word was written for, and the row carries what they said last.
  it('takes a changed answer and keeps the latest', async () => {
    await seedClosedDay();

    await outcome(item.itemId, 'did_well').expect(200);
    await outcome(item.itemId, 'sold_out').expect(200);
    await app.get(Subscriptions).drain();

    expect(await upcomingOutcomes()).toEqual({ 'item-1': 'sold_out' });
  });

  // Decision 54's boundary reaching HTTP: a market still running has nothing to judge,
  // and the domain error is a DomainError, so it lands as 400 (ADR 0045).
  it('rejects a day still trading as a bad request', async () => {
    await authed('post', '/catalogue').send(item).expect(201);
    await authed('post', '/market-schedules').send(schedule).expect(201);
    await authed('put', `/market-days/market-1/${TUESDAY}/menu`).send({ itemIds: [item.itemId] }).expect(200);
    await app.get(Subscriptions).drain();

    await outcome(item.itemId, 'did_well').expect(400);
  });

  it("rejects an item that was never on the day's menu as a bad request", async () => {
    await seedClosedDay();

    await outcome('never-planned', 'did_well').expect(400);
  });

  // Gated at the edge (ADR 0046): an unknown word never reaches the aggregate, so the read
  // model is never asked to hold a level nothing renders.
  it('rejects an outcome the scale does not have', async () => {
    await seedClosedDay();

    await outcome(item.itemId, 'sold_quite_well').expect(400);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .put(`/market-days/market-1/${TUESDAY}/items/item-1/outcome`)
      .send({ outcome: 'did_well' })
      .expect(401);
  });
});
