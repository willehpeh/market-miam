import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MarketPricesViews, MarketPricesViewStore } from '@market-miam/market-days';
import { bootApiTestApp, fixedClock } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

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

describe('Rebuilding the market prices projection', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
  });

  afterEach(async () => {
    await app.close();
  });

  const authed = (method: 'post' | 'put', url: string) =>
    request(app.getHttpServer())[method](url).set('Authorization', 'Bearer any-token');

  it('clears the read model and replays it from the event log', async () => {
    await authed('post', '/catalogue').send(item).expect(201);
    await authed('post', '/market-schedules').send(schedule).expect(201);
    await authed('put', '/market-prices/market-1').send({ prices: { [item.itemId]: 1500 } }).expect(200);
    await app.get(Subscriptions).drain();

    // An orphan row with no backing events — only a real clear removes it, since replay
    // never recreates it. This is what distinguishes clear+replay from a no-op.
    await app.get(MarketPricesViewStore).setPrices(
      { marketId: 'market-1', prices: { 'ghost-item': 100 } },
      'ghost-vendor',
    );

    await app.get(Subscriptions).rebuild('market-prices-view');

    expect(await app.get(MarketPricesViews).forVendor('acme-bakery')).toEqual([
      { marketId: 'market-1', prices: { [item.itemId]: 1500 } },
    ]);
    expect(await app.get(MarketPricesViews).forVendor('ghost-vendor')).toEqual([]);
  });
});
