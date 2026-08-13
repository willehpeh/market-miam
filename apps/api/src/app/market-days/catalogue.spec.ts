import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

const item = {
  itemId: 'item-1',
  name: 'Bœuf bourguignon',
  description: 'Mijoté maison',
  price: 1300,
  imageReference: 'v1/dishes/acme-bakery/item-1',
};

describe('Managing a catalogue over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  function post(body: object) {
    return request(app.getHttpServer()).post('/catalogue').set('Authorization', 'Bearer any-token').send(body);
  }

  function retire(itemId: string) {
    return request(app.getHttpServer()).delete(`/catalogue/${itemId}`).set('Authorization', 'Bearer any-token');
  }

  function list() {
    return request(app.getHttpServer()).get('/catalogue').set('Authorization', 'Bearer any-token');
  }

  it('adds an item and lists it back for the authenticated vendor', async () => {
    await post(item).expect(201);
    await app.get(Subscriptions).drain();

    const response = await request(app.getHttpServer())
      .get('/catalogue')
      .set('Authorization', 'Bearer any-token')
      .expect(200);

    expect(response.body).toEqual({ items: [item] });
  });

  it('adds a variant item and lists it back with its variants', async () => {
    const variantItem = {
      itemId: 'pizza',
      name: 'Pizza',
      description: 'Wood-fired',
      imageReference: 'v1/dishes/acme-bakery/pizza',
      variants: [
        { name: 'Margherita', description: '', price: 900 },
        { name: 'Pepperoni', description: 'spicy', price: 1200 },
      ],
    };
    await post(variantItem).expect(201);
    await app.get(Subscriptions).drain();

    const response = await request(app.getHttpServer())
      .get('/catalogue')
      .set('Authorization', 'Bearer any-token')
      .expect(200);

    expect(response.body).toEqual({ items: [variantItem] });
  });

  it('revises a flat item into a variant item over HTTP', async () => {
    await post(item).expect(201);
    await request(app.getHttpServer())
      .put(`/catalogue/${item.itemId}`)
      .set('Authorization', 'Bearer any-token')
      .send({
        name: 'Pizza',
        description: 'Wood-fired',
        variants: [
          { name: 'Margherita', description: '', price: 900 },
          { name: 'Pepperoni', description: 'spicy', price: 1200 },
        ],
      })
      .expect(200);
    await app.get(Subscriptions).drain();

    const response = await request(app.getHttpServer())
      .get('/catalogue')
      .set('Authorization', 'Bearer any-token')
      .expect(200);

    expect(response.body).toEqual({
      items: [{
        itemId: item.itemId,
        name: 'Pizza',
        description: 'Wood-fired',
        imageReference: item.imageReference,
        variants: [
          { name: 'Margherita', description: '', price: 900 },
          { name: 'Pepperoni', description: 'spicy', price: 1200 },
        ],
      }],
    });
  });

  it('reorders the catalogue, listing the items back in the order the vendor chose', async () => {
    const second = { ...item, itemId: 'item-2', name: 'Blanquette de veau', imageReference: 'v1/dishes/acme-bakery/item-2' };
    await post(item).expect(201);
    await post(second).expect(201);

    await request(app.getHttpServer())
      .put('/catalogue/order')
      .set('Authorization', 'Bearer any-token')
      .send({ itemIds: [second.itemId, item.itemId] })
      .expect(200);
    await app.get(Subscriptions).drain();

    const response = await request(app.getHttpServer())
      .get('/catalogue')
      .set('Authorization', 'Bearer any-token')
      .expect(200);

    expect(response.body).toEqual({ items: [second, item] });
  });

  it('retires an item, dropping it from the listed catalogue', async () => {
    const second = { ...item, itemId: 'item-2', name: 'Blanquette de veau', imageReference: 'v1/dishes/acme-bakery/item-2' };
    await post(item).expect(201);
    await post(second).expect(201);

    await retire(item.itemId).expect(200);
    await app.get(Subscriptions).drain();

    const response = await list().expect(200);
    expect(response.body).toEqual({ items: [second] });
  });

  it('takes a second retirement of the same item as a no-op', async () => {
    await post(item).expect(201);
    await retire(item.itemId).expect(200);

    await retire(item.itemId).expect(200);
    await app.get(Subscriptions).drain();

    const response = await list().expect(200);
    expect(response.body).toEqual({ items: [] });
  });

  it('takes retiring an item it has never heard of as a no-op', async () => {
    await post(item).expect(201);

    await retire('no-such-item').expect(200);
    await app.get(Subscriptions).drain();

    const response = await list().expect(200);
    expect(response.body).toEqual({ items: [item] });
  });

  it('reorders the items that are left after a retirement', async () => {
    const second = { ...item, itemId: 'item-2', name: 'Blanquette de veau', imageReference: 'v1/dishes/acme-bakery/item-2' };
    const third = { ...item, itemId: 'item-3', name: 'Coq au vin', imageReference: 'v1/dishes/acme-bakery/item-3' };
    await post(item).expect(201);
    await post(second).expect(201);
    await post(third).expect(201);
    await retire(second.itemId).expect(200);

    await request(app.getHttpServer())
      .put('/catalogue/order')
      .set('Authorization', 'Bearer any-token')
      .send({ itemIds: [third.itemId, item.itemId] })
      .expect(200);
    await app.get(Subscriptions).drain();

    const response = await list().expect(200);
    expect(response.body).toEqual({ items: [third, item] });
  });

  it('returns an empty catalogue for a vendor with no items', async () => {
    const response = await request(app.getHttpServer())
      .get('/catalogue')
      .set('Authorization', 'Bearer any-token')
      .expect(200);

    expect(response.body).toEqual({ items: [] });
  });

  it('rejects an item with an empty name as a bad request', async () => {
    await post({ ...item, name: '' }).expect(400);
  });

  it('rejects a fractional price as a bad request', async () => {
    await post({ ...item, price: 12.5 }).expect(400);
  });

  it('adds an item without a photo, listing it back with an empty image reference', async () => {
    const withoutPhoto = { itemId: item.itemId, name: item.name, description: item.description, price: item.price };
    await post(withoutPhoto).expect(201);
    await app.get(Subscriptions).drain();

    const response = await request(app.getHttpServer())
      .get('/catalogue')
      .set('Authorization', 'Bearer any-token')
      .expect(200);

    expect(response.body).toEqual({ items: [{ ...withoutPhoto, imageReference: '' }] });
  });
});
