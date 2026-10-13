import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp } from '../testing/api-test-app';
import { EventStore } from '@market-miam/event-sourcing';
import { Subscriptions } from '../event-sourcing/subscriptions';

const item = {
  itemId: 'item-1',
  name: 'Bœuf bourguignon',
  description: 'Mijoté maison',
  price: 1300,
  imageReference: 'v1/dishes/acme-bakery/item-1',
  allergens: ['gluten', 'milk'],
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
      allergens: ['gluten', 'milk'],
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
        allergens: ['gluten'],
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
        allergens: ['gluten'],
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
    const withoutPhoto = { itemId: item.itemId, name: item.name, description: item.description, price: item.price, allergens: item.allergens };
    await post(withoutPhoto).expect(201);
    await app.get(Subscriptions).drain();

    const response = await request(app.getHttpServer())
      .get('/catalogue')
      .set('Authorization', 'Bearer any-token')
      .expect(200);

    expect(response.body).toEqual({ items: [{ ...withoutPhoto, imageReference: '' }] });
  });

  describe('allergens (INCO 1169/2011)', () => {
    function revise(itemId: string, body: object) {
      return request(app.getHttpServer()).put(`/catalogue/${itemId}`).set('Authorization', 'Bearer any-token').send(body);
    }

    async function listed() {
      await app.get(Subscriptions).drain();
      return (await list().expect(200)).body.items;
    }

    // Silence is not "none": a dish the vendor said nothing about must not read as safe.
    it('rejects an item whose allergens are not declared', async () => {
      const { allergens: _allergens, ...undeclared } = item;

      await post(undeclared).expect(400);
    });

    it('rejects an allergen outside the 14 of the regulation', async () => {
      await post({ ...item, allergens: ['gluten', 'avocado'] }).expect(400);
    });

    it('takes an empty list as declaring none of the 14', async () => {
      await post({ ...item, allergens: [] }).expect(201);

      expect((await listed())[0].allergens).toEqual([]);
    });

    it("lists each allergen once, in the regulation's order", async () => {
      await post({ ...item, allergens: ['milk', 'gluten', 'milk'] }).expect(201);

      expect((await listed())[0].allergens).toEqual(['gluten', 'milk']);
    });

    it('revises an item that only changes its allergens', async () => {
      await post(item).expect(201);

      await revise(item.itemId, { name: item.name, description: item.description, price: item.price, allergens: ['gluten', 'eggs', 'milk'] }).expect(200);

      expect((await listed())[0].allergens).toEqual(['gluten', 'eggs', 'milk']);
    });

    it('rejects a revision whose allergens are not declared', async () => {
      await post(item).expect(201);

      await revise(item.itemId, { name: item.name, description: item.description, price: item.price }).expect(400);
    });

    // Added before allergens existed: the event says nothing, so neither does the list.
    it('lists an item added before allergens existed as undeclared', async () => {
      await app.get(EventStore).append('catalogue-acme-bakery', [
        { type: 'ItemAddedToCatalogue', payload: { itemId: 'old', name: 'Tarte tatin', description: 'Aux pommes', price: 600 }, version: 1 },
      ], 0, { vendorId: 'acme-bakery' });

      expect((await listed())[0].allergens).toBeNull();
    });
  });
});
