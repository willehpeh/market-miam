import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { InMemoryPaymentAccounts, InMemoryPayments } from '@market-miam/ordering';
import { assignSubdomainFor, bootApiTestApp, fixedClock, publishStorefrontFor, testVendor } from '../testing/api-test-app';
import { StripeEvents } from '../testing/stripe-events';
import { VendorApi } from '../testing/vendor-api';
import { Visitor } from '../testing/visitor';
import { Subscriptions } from '../event-sourcing/subscriptions';

const TUESDAY = '2026-06-23';

const bourguignon = {
  itemId: 'item-1',
  name: 'Bœuf bourguignon',
  description: 'Mijoté maison',
  price: 1300,
  imageReference: 'v1/dishes/acme-bakery/item-1',
  allergens: [],
};

const pizza = {
  itemId: 'item-2',
  name: 'Pizza',
  description: 'Au feu de bois',
  imageReference: 'v1/dishes/acme-bakery/item-2',
  allergens: ['gluten', 'milk'],
  variants: [
    { name: 'Margherita', description: '', price: 900 },
    { name: 'Pepperoni', description: 'épicée', price: 1200 },
  ],
};

const tuesdays = {
  scheduleId: 'schedule-1',
  startDate: TUESDAY,
  market: {
    id: 'market-1',
    name: 'Marché de Belleville',
    streetAddress: 'Boulevard de Belleville',
    codePostal: '75011',
    town: 'Paris',
    pitch: 'B12',
  },
  days: [{ day: 'TUE', startTime: '07:00', endTime: '14:30' }],
  frequency: { weeks: 1 },
};

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
    await planToday();

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

  async function planToday(): Promise<void> {
    await vendor.addItem(bourguignon).expect(201);
    await vendor.addItem(pizza).expect(201);
    await vendor.registerSchedule(tuesdays).expect(201);
    await vendor.setMenu('market-1', TUESDAY, [bourguignon.itemId, pizza.itemId]).expect(200);
    await app.get(Subscriptions).drain();
  }
});
