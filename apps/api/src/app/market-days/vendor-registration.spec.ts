import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EventStore } from '@market-monster/event-sourcing';
import { bootApiTestApp, fixedClock, FIXED_NOW } from '../testing/api-test-app';

describe('Vendor registration over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
  });

  afterEach(async () => {
    await app.close();
  });

  it('registers the authenticated vendor, stamping correlation and causation lineage', async () => {
    await request(app.getHttpServer())
      .post('/vendors')
      .set('Authorization', 'Bearer any-token')
      .expect(201);

    const events = await app.get(EventStore).load('vendor-acme-bakery');

    expect(events).toEqual([
      expect.objectContaining({
        type: 'VendorRegistered',
        payload: {
          vendorId: 'acme-bakery',
          registeredAt: FIXED_NOW,
          email: 'owner@acme.test',
        },
        metadata: expect.objectContaining({
          vendorId: 'acme-bakery',
        }),
      }),
    ]);
  });
});
