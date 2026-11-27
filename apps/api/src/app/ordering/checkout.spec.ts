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

  it.each<[string, (vendor: VendorApi) => Promise<unknown>, object[]]>([
    ['closed', vendor => vendor.closeDay('market-1', TUESDAY).expect(200), [{ dishId: 'item-1', quantity: 1 }]],
    ['sold-out', vendor => vendor.markSoldOut('market-1', TUESDAY, 'item-1').expect(200), [{ dishId: 'item-1', quantity: 1 }]],
    ['over-cap', async () => undefined, [{ dishId: 'item-1', quantity: 10 }]],
  ])('answers 409 refused as %s', async (refused, arrange, basket) => {
    await openForOrders();
    await planTuesday(app, vendor);
    await arrange(vendor);
    await app.get(Subscriptions).drain();

    const response = await new Visitor(app).startCheckout('acme', { marketId: 'market-1', basket }).expect(409);

    expect(response.body).toEqual({ refused });
  });

  it('answers 409 refused as not-taking-orders while the vendor’s account takes no card payments', async () => {
    await openForOrders({ cardPayments: 'inactive' });
    await planTuesday(app, vendor);

    const response = await new Visitor(app)
      .startCheckout('acme', { marketId: 'market-1', basket: [{ dishId: 'item-1', quantity: 1 }] })
      .expect(409);

    expect(response.body).toEqual({ refused: 'not-taking-orders' });
  });

  it('answers 404 where no storefront is published at the subdomain', async () => {
    await new Visitor(app)
      .startCheckout('nobody', { marketId: 'market-1', basket: [{ dishId: 'item-1', quantity: 1 }] })
      .expect(404);
  });

  it('answers 400 for a malformed basket, which no working storefront sends', async () => {
    await openForOrders();
    await planTuesday(app, vendor);

    await new Visitor(app).startCheckout('acme', { marketId: 'market-1', basket: [] }).expect(400);
  });

  async function openForOrders({ cardPayments = 'active' } = {}): Promise<string> {
    await publishStorefrontFor(app, 'acme-bakery');
    await assignSubdomainFor(app, 'acme-bakery', 'acme');
    await app.get(Subscriptions).drain();
    await vendor.startPaymentAccountRegistration(registration).expect(202);
    await app.get(Subscriptions).drain();
    const accountId = InMemoryPaymentAccounts.accountIdFor(registration.registrationId);
    if (cardPayments === 'active') {
      paymentAccounts.enableCardPayments(accountId);
    }
    await new StripeEvents(app).accountUpdated('evt_test_1', accountId).expect(200);
    await app.get(Subscriptions).drain();
    return accountId;
  }
});
