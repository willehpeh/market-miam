import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CatalogueViews, CatalogueViewStore } from '@market-miam/market-days';
import { bootApiTestApp } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

const item = {
  itemId: 'item-1',
  name: 'Bœuf bourguignon',
  description: 'Mijoté maison',
  price: 1300,
  imageReference: 'v1/dishes/acme-bakery/item-1',
};

describe('Rebuilding the catalogue projection', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
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
    await app.get(Subscriptions).drain();

    // An orphan row with no backing events — only a real clear removes it, since
    // replay never recreates it. This is what distinguishes clear+replay from a no-op.
    await app.get(CatalogueViewStore).addItemToCatalogue(
      { ...item, itemId: 'ghost-item' },
      'ghost-vendor',
    );

    await app.get(Subscriptions).rebuild('catalogue-view');

    const rebuilt = await request(app.getHttpServer())
      .get('/catalogue')
      .set('Authorization', 'Bearer any-token')
      .expect(200);
    expect(rebuilt.body).toEqual({ items: [item] });
    expect(await app.get(CatalogueViews).forVendor('ghost-vendor')).toEqual({ items: [] });
  });

  // A chosen order lives only in the read model — the log carries it as ItemsReordered,
  // and a rebuild has to replay that on top of a freshly-seeded insertion order to get
  // back to it. Rebuilding into the wrong order silently reshuffles a vendor's storefront.
  it('replays a chosen order rather than reverting to the order items were added', async () => {
    for (const itemId of ['a', 'b', 'c']) {
      await request(app.getHttpServer())
        .post('/catalogue')
        .set('Authorization', 'Bearer any-token')
        .send({ ...item, itemId, name: itemId.toUpperCase() })
        .expect(201);
    }
    await request(app.getHttpServer())
      .put('/catalogue/order')
      .set('Authorization', 'Bearer any-token')
      .send({ itemIds: ['c', 'a', 'b'] })
      .expect(200);
    await app.get(Subscriptions).drain();

    await app.get(Subscriptions).rebuild('catalogue-view');

    const rebuilt = await request(app.getHttpServer())
      .get('/catalogue')
      .set('Authorization', 'Bearer any-token')
      .expect(200);
    expect(rebuilt.body.items.map((item: { itemId: string }) => item.itemId)).toEqual(['c', 'a', 'b']);
  });
});
