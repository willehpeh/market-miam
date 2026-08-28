import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EventStore } from '@market-miam/event-sourcing';
import { bootApiTestApp, openStorefrontFor } from '../testing/api-test-app';

describe('Choosing whether the carte quotes prices, over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  const setVisibility = (visible: unknown) =>
    request(app.getHttpServer())
      .put('/storefront/carte-prices')
      .set('Authorization', 'Bearer any-token')
      .send({ visible });

  const storedEvents = () => app.get(EventStore).load('storefront-acme-bakery');

  it('records a vendor hiding the prices on their carte', async () => {
    await openStorefrontFor(app, 'acme-bakery');

    await setVisibility(false).expect(200);

    expect(await storedEvents()).toEqual([
      expect.objectContaining({ type: 'StorefrontOpened' }),
      expect.objectContaining({ type: 'CartePricesHidden', payload: {} }),
    ]);
  });
});
