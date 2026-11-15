import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EventStore } from '@market-miam/event-sourcing';
import { bootApiTestApp, FIXED_NOW, fixedClock } from '../testing/api-test-app';
import { EventLog } from '../testing/event-log';
import { Subscriptions } from '../event-sourcing/subscriptions';

describe('Registering a payment account over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
  });

  afterEach(async () => {
    await app.close();
  });

  it('starts the registration of a vendor whose storefront is published', async () => {
    await publishStorefrontFor('acme-bakery');

    await request(app.getHttpServer())
      .post('/payment-account/registrations')
      .set('Authorization', 'Bearer any-token')
      .send({ registrationId: 'registration-1', accountToken: 'accttok_test_1' })
      .expect(202);

    expect(await new EventLog(app).ofType('PaymentAccountRegistrationStarted')).toEqual([
      expect.objectContaining({
        payload: { vendorId: 'acme-bakery', registrationId: 'registration-1', accountToken: 'accttok_test_1', startedAt: FIXED_NOW },
      }),
    ]);
  });

  async function publishStorefrontFor(vendorId: string): Promise<void> {
    await app.get(EventStore).append(`storefront-${vendorId}`, [
      { type: 'StorefrontOpened', payload: { vendorId }, version: 1 },
      { type: 'StorefrontPublished', payload: {}, version: 1 },
    ], 0, { vendorId });
    await app.get(Subscriptions).drain();
  }
});
