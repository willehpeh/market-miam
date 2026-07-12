import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EventStore } from '@market-miam/event-sourcing';
import { bootApiTestApp, openStorefrontFor } from '../testing/api-test-app';

describe('Setting a storefront cover photo over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('records the versioned cover photo reference for the authenticated vendor', async () => {
    await openStorefrontFor(app, 'acme-bakery');

    await request(app.getHttpServer())
      .put('/storefront/cover-photo')
      .set('Authorization', 'Bearer any-token')
      .send({ version: 7 })
      .expect(200);

    const events = await app.get(EventStore).load('storefront-acme-bakery');
    expect(events).toEqual([
      expect.objectContaining({ type: 'StorefrontOpened' }),
      expect.objectContaining({
        type: 'StorefrontCoverPhotoSet',
        payload: { imageReference: 'v7/vendors/acme-bakery/storefront/cover-photo' },
      }),
    ]);
  });
});
