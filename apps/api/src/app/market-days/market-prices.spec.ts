import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp, fixedClock } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

// fixedClock is 2026-06-23T09:00Z — a Tuesday, 11:00 in Paris.
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
    codePostal: '75011',
    town: 'Paris',
  },
  days: [{ day: 'TUE', startTime: '07:00', endTime: '14:30' }],
  frequency: { weeks: 1 },
};

describe('Pricing a market over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
  });

  afterEach(async () => {
    await app.close();
  });

  const authed = (method: 'post' | 'put' | 'get', url: string) =>
    request(app.getHttpServer())[method](url).set('Authorization', 'Bearer any-token');

  const setPrices = (prices: unknown, marketId = 'market-1') =>
    authed('put', `/market-prices/${marketId}`).send({ prices });

  const setMenu = (itemIds: string[]) =>
    authed('put', `/market-days/market-1/${TUESDAY}/menu`).send({ itemIds });

  async function seedCatalogueAndSchedule(): Promise<void> {
    await authed('post', '/catalogue').send(item).expect(201);
    await authed('post', '/market-schedules').send(schedule).expect(201);
    await app.get(Subscriptions).drain();
  }

  it('takes what the vendor charges at one market', async () => {
    await seedCatalogueAndSchedule();

    await setPrices({ 'item-1': 1500 }).expect(200);
  });

  it('takes a price per variant', async () => {
    await authed('post', '/catalogue').send({
      itemId: 'pizza',
      name: 'Pizza',
      description: '',
      variants: [
        { name: 'Margherita', description: '', price: 900 },
        { name: 'Pepperoni', description: 'piquante', price: 1200 },
      ],
      imageReference: 'v1/dishes/acme-bakery/pizza',
    }).expect(201);
    await authed('post', '/market-schedules').send(schedule).expect(201);

    await setPrices({ pizza: { Pepperoni: 1400 } }).expect(200);
  });

  // A 400 here is the proof the route reaches the aggregate rather than merely accepting
  // the body: only the calendar knows which markets this vendor stands at.
  it('rejects a market the vendor does not schedule as a bad request', async () => {
    await seedCatalogueAndSchedule();

    await setPrices({ 'item-1': 1500 }, 'market-2').expect(400);
  });

  it('rejects a dish the vendor does not have as a bad request', async () => {
    await seedCatalogueAndSchedule();

    await setPrices({ 'not-mine': 1500 }).expect(400);
  });

  it('rejects a price that is not whole cents as a bad request', async () => {
    await seedCatalogueAndSchedule();

    await setPrices({ 'item-1': 12.5 }).expect(400);
  });

  it('rejects one price for a dish sold by variant as a bad request', async () => {
    await seedCatalogueAndSchedule();

    await setPrices({ 'item-1': { Grande: 1500 } }).expect(400);
  });

  it('rejects a body whose prices are not cents', async () => {
    await seedCatalogueAndSchedule();

    await setPrices({ 'item-1': 'gratuit' }).expect(400);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .put('/market-prices/market-1')
      .send({ prices: { 'item-1': 1500 } })
      .expect(401);
  });

  it('quotes the dish at that price on the vendor\'s upcoming days', async () => {
    await seedCatalogueAndSchedule();
    await setMenu([item.itemId]).expect(200);

    await setPrices({ [item.itemId]: 1500 }).expect(200);
    await app.get(Subscriptions).drain();

    const response = await authed('get', '/market-days/upcoming').expect(200);
    expect(response.body.marketDays[0]).toMatchObject({
      marketId: 'market-1',
      date: TUESDAY,
      items: [expect.objectContaining({ itemId: item.itemId, name: item.name, price: 1500 })],
    });
  });

  it('goes back to the catalogue price when the market is cleared', async () => {
    await seedCatalogueAndSchedule();
    await setMenu([item.itemId]).expect(200);
    await setPrices({ [item.itemId]: 1500 }).expect(200);

    await setPrices({}).expect(200);
    await app.get(Subscriptions).drain();

    const response = await authed('get', '/market-days/upcoming').expect(200);
    expect(response.body.marketDays[0].items).toEqual([
      expect.objectContaining({ itemId: item.itemId, price: item.price }),
    ]);
  });

  it('gives the vendor back what they charge at a market', async () => {
    await seedCatalogueAndSchedule();
    await setPrices({ [item.itemId]: 1500 }).expect(200);
    await app.get(Subscriptions).drain();

    const response = await authed('get', '/market-prices').expect(200);
    expect(response.body).toEqual({
      markets: [{ marketId: 'market-1', prices: { [item.itemId]: 1500 } }],
    });
  });

  it('gives back every market the vendor prices', async () => {
    await seedCatalogueAndSchedule();
    await authed('post', '/market-schedules').send({
      ...schedule,
      scheduleId: 'schedule-2',
      market: { ...schedule.market, id: 'market-2', name: 'Marché d\'Aligre' },
    }).expect(201);
    await setPrices({ [item.itemId]: 1500 }, 'market-1').expect(200);
    await setPrices({ [item.itemId]: 1700 }, 'market-2').expect(200);
    await app.get(Subscriptions).drain();

    const response = await authed('get', '/market-prices').expect(200);
    expect(response.body.markets).toEqual([
      { marketId: 'market-1', prices: { [item.itemId]: 1500 } },
      { marketId: 'market-2', prices: { [item.itemId]: 1700 } },
    ]);
  });

  it('gives back nothing for a vendor who has priced no market', async () => {
    await seedCatalogueAndSchedule();

    const response = await authed('get', '/market-prices').expect(200);
    expect(response.body).toEqual({ markets: [] });
  });

  it('requires authentication to read what a vendor charges', async () => {
    await request(app.getHttpServer()).get('/market-prices').expect(401);
  });
});
