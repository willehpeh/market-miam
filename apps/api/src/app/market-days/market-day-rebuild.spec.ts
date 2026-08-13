import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MarketDayViews, MarketDayViewStore } from '@market-miam/market-days';
import { bootApiTestApp, fixedClock } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

const SATURDAY = '2026-06-27';

const item = {
  itemId: 'item-1',
  name: 'Bœuf bourguignon',
  description: 'Mijoté maison',
  price: 1300,
  imageReference: 'v1/dishes/acme-bakery/item-1',
};

describe('Rebuilding the market day projection', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
  });

  afterEach(async () => {
    await app.close();
  });

  it('clears the read model and replays it from the event log', async () => {
    await request(app.getHttpServer())
      .post('/catalogue')
      .set('Authorization', 'Bearer any-token')
      .send(item)
      .expect(201);
    await request(app.getHttpServer())
      .put(`/market-days/market-1/${SATURDAY}/menu`)
      .set('Authorization', 'Bearer any-token')
      .send({ itemIds: [item.itemId] })
      .expect(200);
    await app.get(Subscriptions).drain();

    // An orphan row with no backing events — only a real clear removes it, since
    // replay never recreates it. This is what distinguishes clear+replay from a no-op.
    await app.get(MarketDayViewStore).setMenu(
      { marketId: 'market-1', date: SATURDAY, itemIds: ['ghost-item'] },
      'ghost-vendor',
    );

    await app.get(Subscriptions).rebuild('market-day-view');

    expect(await app.get(MarketDayViews).menusFor('acme-bakery', SATURDAY, SATURDAY)).toEqual([
      { marketId: 'market-1', date: SATURDAY, itemIds: [item.itemId] },
    ]);
    expect(await app.get(MarketDayViews).menusFor('ghost-vendor', SATURDAY, SATURDAY)).toEqual([]);
  });
});
