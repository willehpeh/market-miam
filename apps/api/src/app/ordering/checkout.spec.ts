import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { InMemoryPaymentAccounts, InMemoryPayments } from '@market-miam/ordering';
import { assignSubdomainFor, bootApiTestApp, fixedClock, publishStorefrontFor, testVendor } from '../testing/api-test-app';
import { StripeEvents } from '../testing/stripe-events';
import { VendorApi } from '../testing/vendor-api';
import { Visitor } from '../testing/visitor';
import { Subscriptions } from '../event-sourcing/subscriptions';
import { planTuesday, TUESDAY } from './tuesday-at-belleville';

const registration = { registrationId: 'registration-1', accountToken: 'accttok_test_1' };

describe('Starting a checkout over HTTP', () => {
  let app: INestApplication;
  let vendor: VendorApi;
  let payments: InMemoryPayments;
  let paymentAccounts: InMemoryPaymentAccounts;

  beforeEach(async () => {
    payments = new InMemoryPayments();
    paymentAccounts = new InMemoryPaymentAccounts();
    app = await bootApiTestApp({ clock: fixedClock, payments, paymentAccounts });
    vendor = new VendorApi(app, testVendor.vendorId.value(), testVendor.email.value());
  });

  afterEach(async () => {
    await app.close();
  });

  it('answers the address of the checkout started for a visitor’s basket on the vendor’s account', async () => {
    const accountId = await openForOrders();
    await planTuesday(app, vendor);

    const response = await new Visitor(app)
      .startCheckout('acme', {
        marketId: 'market-1',
        basket: [
          { dishId: 'item-1', quantity: 2 },
          { dishId: 'item-2', variant: 'Pepperoni', quantity: 1 },
        ],
      })
      .expect(200);

    expect(payments.checkoutAt(response.body.url)).toMatchObject({
      accountId,
      vendorId: 'acme-bakery',
      marketId: 'market-1',
      date: TUESDAY,
      lines: [
        { dishId: 'item-1', quantity: 2, unitPrice: 1300 },
        { dishId: 'item-2', variant: 'Pepperoni', quantity: 1, unitPrice: 1200 },
      ],
    });
  });

  async function openForOrders(): Promise<string> {
    await publishStorefrontFor(app, 'acme-bakery');
    await assignSubdomainFor(app, 'acme-bakery', 'acme');
    await app.get(Subscriptions).drain();
    await vendor.startPaymentAccountRegistration(registration).expect(202);
    await app.get(Subscriptions).drain();
    const accountId = InMemoryPaymentAccounts.accountIdFor(registration.registrationId);
    paymentAccounts.enableCardPayments(accountId);
    await new StripeEvents(app).accountUpdated('evt_test_1', accountId).expect(200);
    await app.get(Subscriptions).drain();
    return accountId;
  }
});
