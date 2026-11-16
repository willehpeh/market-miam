import { afterEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request, { Test } from 'supertest';
import { EventStore } from '@market-miam/event-sourcing';
import { InMemoryPaymentAccounts } from '@market-miam/ordering';
import { bootApiTestApp, FIXED_NOW, fixedClock, openStorefrontFor } from '../testing/api-test-app';
import { EventLog } from '../testing/event-log';
import { Subscriptions } from '../event-sourcing/subscriptions';

class RefusingPaymentAccounts extends InMemoryPaymentAccounts {
  override createFor() {
    return Promise.resolve('refused' as const);
  }
}

describe('Registering a payment account over HTTP', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it('starts the registration of a vendor whose storefront is published', async () => {
    app = await bootApiTestApp({ clock: fixedClock });
    await publishStorefrontFor('acme-bakery');

    await startRegistration().expect(202);

    expect(await new EventLog(app).ofType('PaymentAccountRegistrationStarted')).toEqual([
      expect.objectContaining({
        payload: { vendorId: 'acme-bakery', registrationId: 'registration-1', accountToken: 'accttok_test_1', startedAt: FIXED_NOW },
      }),
    ]);
  });

  it('records the registration failed once Stripe refuses its account', async () => {
    app = await bootApiTestApp({ clock: fixedClock, paymentAccounts: new RefusingPaymentAccounts() });
    await publishStorefrontFor('acme-bakery');
    await startRegistration().expect(202);

    await app.get(Subscriptions).drain();

    expect(await new EventLog(app).ofType('PaymentAccountRegistrationFailed')).toEqual([
      expect.objectContaining({
        payload: { vendorId: 'acme-bakery', registrationId: 'registration-1', failedAt: FIXED_NOW },
      }),
    ]);
  });

  it('refuses as a bad request a vendor whose storefront is not published', async () => {
    app = await bootApiTestApp({ clock: fixedClock });
    await openStorefrontFor(app, 'acme-bakery');
    await app.get(Subscriptions).drain();

    const response = await startRegistration().expect(400);

    expect(response.body.message).toContain('not published');
  });

  it('refuses as a bad request another registration while one is open', async () => {
    app = await bootApiTestApp({ clock: fixedClock });
    await publishStorefrontFor('acme-bakery');
    await startRegistration('registration-1').expect(202);

    const response = await startRegistration('registration-2').expect(400);

    expect(response.body.message).toContain('already open');
  });

  function startRegistration(registrationId = 'registration-1'): Test {
    return request(app.getHttpServer())
      .post('/payment-account/registrations')
      .set('Authorization', 'Bearer any-token')
      .send({ registrationId, accountToken: 'accttok_test_1' });
  }

  async function publishStorefrontFor(vendorId: string): Promise<void> {
    await app.get(EventStore).append(`storefront-${vendorId}`, [
      { type: 'StorefrontOpened', payload: { vendorId }, version: 1 },
      { type: 'StorefrontPublished', payload: {}, version: 1 },
    ], 0, { vendorId });
    await app.get(Subscriptions).drain();
  }
});
