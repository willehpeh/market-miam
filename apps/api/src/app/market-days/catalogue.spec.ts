import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

const dish = {
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

  it('adds a dish and lists it back for the authenticated vendor', async () => {
    await post(dish).expect(201);
    await app.get(Subscriptions).drain();

    const response = await request(app.getHttpServer())
      .get('/catalogue')
      .set('Authorization', 'Bearer any-token')
      .expect(200);

    expect(response.body).toEqual({ items: [dish] });
  });

  it('returns an empty catalogue for a vendor with no dishes', async () => {
    const response = await request(app.getHttpServer())
      .get('/catalogue')
      .set('Authorization', 'Bearer any-token')
      .expect(200);

    expect(response.body).toEqual({ items: [] });
  });

  it('rejects a dish with an empty name as a bad request', async () => {
    await post({ ...dish, name: '' }).expect(400);
  });

  it('rejects a fractional price as a bad request', async () => {
    await post({ ...dish, price: 12.5 }).expect(400);
  });

  it('adds a dish without a photo, listing it back with an empty image reference', async () => {
    const withoutPhoto = { itemId: dish.itemId, name: dish.name, description: dish.description, price: dish.price };
    await post(withoutPhoto).expect(201);
    await app.get(Subscriptions).drain();

    const response = await request(app.getHttpServer())
      .get('/catalogue')
      .set('Authorization', 'Bearer any-token')
      .expect(200);

    expect(response.body).toEqual({ items: [{ ...withoutPhoto, imageReference: '' }] });
  });
});
