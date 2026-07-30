import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CatalogueViews, CatalogueViewStore } from '@market-miam/market-days';
import { bootApiTestApp } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

const dish = {
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
      .send(dish)
      .expect(201);
    await app.get(Subscriptions).drain();

    // An orphan row with no backing events — only a real clear removes it, since
    // replay never recreates it. This is what distinguishes clear+replay from a no-op.
    await app.get(CatalogueViewStore).addItemToCatalogue(
      { ...dish, itemId: 'ghost-item' },
      'ghost-vendor',
    );

    await app.get(Subscriptions).rebuild('catalogue-view');

    const rebuilt = await request(app.getHttpServer())
      .get('/catalogue')
      .set('Authorization', 'Bearer any-token')
      .expect(200);
    expect(rebuilt.body).toEqual({ items: [dish] });
    expect(await app.get(CatalogueViews).forVendor('ghost-vendor')).toEqual({ items: [] });
  });
});
