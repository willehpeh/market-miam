import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CommandGateway } from '@market-miam/event-sourcing';
import { MarketDayViews, MarketDayViewStore, SetMarketDayMenu } from '@market-miam/market-days';
import { bootApiTestApp, fixedClock } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

const SATURDAY = '2026-06-27';

const dish = {
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

  // No menu endpoint yet (slice 4) — the command gateway is the public way in until then.
  it('clears the read model and replays it from the event log', async () => {
    await request(app.getHttpServer())
      .post('/catalogue')
      .set('Authorization', 'Bearer any-token')
      .send(dish)
      .expect(201);
    await app.get(CommandGateway).execute(new SetMarketDayMenu({
      vendorId: 'acme-bakery',
      itemIds: [dish.itemId],
      marketId: 'market-1',
      date: SATURDAY,
    }));
    await app.get(Subscriptions).drain();

    // An orphan row with no backing events — only a real clear removes it, since
    // replay never recreates it. This is what distinguishes clear+replay from a no-op.
    await app.get(MarketDayViewStore).setMenu(
      { marketId: 'market-1', date: SATURDAY, itemIds: ['ghost-item'] },
      'ghost-vendor',
    );

    await app.get(Subscriptions).rebuild('market-day-view');

    expect(await app.get(MarketDayViews).menuFor('acme-bakery', 'market-1', SATURDAY)).toEqual({
      marketId: 'market-1',
      date: SATURDAY,
      itemIds: [dish.itemId],
    });
    expect((await app.get(MarketDayViews).menuFor('ghost-vendor', 'market-1', SATURDAY)).itemIds).toEqual([]);
  });
});
