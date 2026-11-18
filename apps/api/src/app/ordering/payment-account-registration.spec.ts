import { afterEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { InMemoryPaymentAccounts } from '@market-miam/ordering';
import {
  ApiTestOptions,
  bootApiTestApp,
  FIXED_NOW,
  fixedClock,
  openStorefrontFor,
  publishStorefrontFor,
  testVendor,
} from '../testing/api-test-app';
import { EventLog } from '../testing/event-log';
import { StripeEvents } from '../testing/stripe-events';
import { VendorApi } from '../testing/vendor-api';
import { Subscriptions } from '../event-sourcing/subscriptions';

class RefusingPaymentAccounts extends InMemoryPaymentAccounts {
  override createFor() {
    return Promise.resolve('refused' as const);
  }
}

const registration = { registrationId: 'registration-1', accountToken: 'accttok_test_1' };

describe('Registering a payment account over HTTP', () => {
  let app: INestApplication;
  let vendor: VendorApi;

  afterEach(async () => {
    await app.close();
  });

  it('starts the registration of a vendor whose storefront is published', async () => {
    await boot();
    await publishStorefrontFor(app, 'acme-bakery');
    await app.get(Subscriptions).drain();

    await vendor.startPaymentAccountRegistration(registration).expect(202);

    expect(await new EventLog(app).ofType('PaymentAccountRegistrationStarted')).toEqual([
      expect.objectContaining({
        payload: { vendorId: 'acme-bakery', registrationId: 'registration-1', accountToken: 'accttok_test_1', startedAt: FIXED_NOW },
      }),
    ]);
  });

  it('records the registration failed once Stripe refuses its account', async () => {
    await boot({ paymentAccounts: new RefusingPaymentAccounts() });
    await publishStorefrontFor(app, 'acme-bakery');
    await app.get(Subscriptions).drain();
    await vendor.startPaymentAccountRegistration(registration).expect(202);

    await app.get(Subscriptions).drain();

    expect(await new EventLog(app).ofType('PaymentAccountRegistrationFailed')).toEqual([
      expect.objectContaining({
        payload: { vendorId: 'acme-bakery', registrationId: 'registration-1', failedAt: FIXED_NOW },
      }),
    ]);
  });

  it('confirms the registration once Stripe notices the account it made for it', async () => {
    await boot();
    await publishStorefrontFor(app, 'acme-bakery');
    await app.get(Subscriptions).drain();
    await vendor.startPaymentAccountRegistration(registration).expect(202);
    await app.get(Subscriptions).drain();

    await new StripeEvents(app).accountUpdated('evt_test_1', 'acct_registration-1').expect(200);
    await app.get(Subscriptions).drain();

    expect(await new EventLog(app).ofType('PaymentAccountRegistrationConfirmed')).toEqual([
      expect.objectContaining({
        payload: { vendorId: 'acme-bakery', registrationId: 'registration-1', accountId: 'acct_registration-1', confirmedAt: FIXED_NOW },
      }),
    ]);
  });

  it('refuses as a bad request a vendor whose storefront is not published', async () => {
    await boot();
    await openStorefrontFor(app, 'acme-bakery');
    await app.get(Subscriptions).drain();

    const response = await vendor.startPaymentAccountRegistration(registration).expect(400);

    expect(response.body.message).toContain('not published');
  });

  it('refuses as a bad request another registration while one is open', async () => {
    await boot();
    await publishStorefrontFor(app, 'acme-bakery');
    await app.get(Subscriptions).drain();
    await vendor.startPaymentAccountRegistration(registration).expect(202);

    const response = await vendor
      .startPaymentAccountRegistration({ ...registration, registrationId: 'registration-2' })
      .expect(400);

    expect(response.body.message).toContain('already open');
  });

  async function boot(options: ApiTestOptions = {}): Promise<void> {
    app = await bootApiTestApp({ clock: fixedClock, ...options });
    vendor = new VendorApi(app, testVendor.vendorId.value(), testVendor.email.value());
  }
});
