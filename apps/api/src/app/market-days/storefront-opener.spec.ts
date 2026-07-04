import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EventStore } from '@market-monster/event-sourcing';
import { VendorStorefrontViews } from '@market-monster/market-days';
import { bootApiTestApp } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

describe('Opening a storefront on registration', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  const register = () =>
    request(app.getHttpServer()).post('/vendors').set('Authorization', 'Bearer any-token').expect(201);

  it('opens an empty storefront for a newly registered vendor', async () => {
    await register();
    await app.get(Subscriptions).drain();

    expect(await app.get(VendorStorefrontViews).findByVendor('acme-bakery')).toEqual({
      name: '',
      description: '',
      imageReference: '',
    });
  });

  it('opens in the registration\'s correlation, caused by the VendorRegistered event', async () => {
    await register();
    await app.get(Subscriptions).drain();

    const [registered] = await app.get(EventStore).load('vendor-acme-bakery');
    const [opened] = await app.get(EventStore).load('storefront-acme-bakery');

    expect(opened.metadata).toEqual(
      expect.objectContaining({
        correlationId: registered.metadata?.['correlationId'],
        causationId: registered.id,
      }),
    );
  });
});
