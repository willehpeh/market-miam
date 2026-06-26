import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EventStore } from '@market-monster/event-sourcing';
import { bootApiTestApp, openStorefrontFor } from './testing/api-test-app';

describe('Editing storefront information over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('records the edited storefront information for the authenticated vendor', async () => {
    await openStorefrontFor(app, 'acme-bakery');

    await request(app.getHttpServer())
      .put('/storefront')
      .set('Authorization', 'Bearer any-token')
      .send({ name: 'Acme Bakery', description: 'Fresh bread daily' })
      .expect(200);

    const events = await app.get(EventStore).load('storefront-acme-bakery');

    expect(events).toEqual([
      expect.objectContaining({
        type: 'StorefrontOpened',
        payload: { vendorId: 'acme-bakery' },
      }),
      expect.objectContaining({
        type: 'StorefrontInformationEdited',
        payload: { name: 'Acme Bakery', description: 'Fresh bread daily' },
        metadata: expect.objectContaining({
          vendorId: 'acme-bakery',
          correlationId: expect.any(String),
          causationId: expect.any(String),
        }),
      }),
    ]);
  });
});
