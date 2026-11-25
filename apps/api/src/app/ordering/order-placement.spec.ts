import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { InMemoryPaymentAccounts, InMemoryPayments } from '@market-miam/ordering';
import { bootApiTestApp, FIXED_NOW, fixedClock, publishStorefrontFor, testVendor } from '../testing/api-test-app';
import { EventLog } from '../testing/event-log';
import { STRIPE_ACCOUNTS_SIGNING_SECRET, StripeEvents } from '../testing/stripe-events';
import { VendorApi } from '../testing/vendor-api';
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

const lines = [
  { dishId: 'item-1', quantity: 2, unitPrice: 1300 },
  { dishId: 'item-2', variant: 'Pepperoni', quantity: 1, unitPrice: 1200 },
];

describe('Placing an order over HTTP', () => {
  let app: INestApplication;
  let vendor: VendorApi;
  let payments: InMemoryPayments;

  beforeEach(async () => {
    payments = new InMemoryPayments();
    app = await bootApiTestApp({ clock: fixedClock, payments });
    vendor = new VendorApi(app, testVendor.vendorId.value(), testVendor.email.value());
  });

  afterEach(async () => {
    await app.close();
  });

  it('places the order whose card Stripe holds on the vendor’s account', async () => {
    const accountId = await holdAnOrderToday();

    await new StripeEvents(app).checkoutCompleted('evt_test_2', 'cs_test_1', accountId).expect(200);

    expect(await new EventLog(app).ofType('OrderPlaced')).toEqual([
      expect.objectContaining({
        payload: {
          vendorId: 'acme-bakery',
          orderId: 'order-1',
          marketId: 'market-1',
          date: TUESDAY,
          lines,
          paymentId: 'pi_test_1',
          placedAt: FIXED_NOW,
        },
      }),
    ]);
  });

  it('refuses an event signed with the accounts destination’s secret, recording nothing', async () => {
    const accountId = await holdAnOrderToday();

    await new StripeEvents(app, STRIPE_ACCOUNTS_SIGNING_SECRET).checkoutCompleted('evt_test_2', 'cs_test_1', accountId).expect(400);

    expect(await new EventLog(app).ofType('OrderPlaced')).toEqual([]);
  });

  it.each([
    ['no account in its context', { context: undefined }],
    ['no checkout in its related object', { related_object: undefined }],
    ['a type the payments route doesn’t handle', { type: 'v1.checkout.session.expired' }],
  ])('refuses an event with %s, recording nothing', async (_, changes) => {
    const accountId = await holdAnOrderToday();

    await new StripeEvents(app).checkoutCompleted('evt_test_2', 'cs_test_1', accountId, changes).expect(400);

    expect(await new EventLog(app).ofType('OrderPlaced')).toEqual([]);
  });

  async function holdAnOrderToday(): Promise<string> {
    const accountId = await confirmPaymentAccount();
    await planToday();
    payments.complete('cs_test_1', {
      vendorId: 'acme-bakery',
      order: { orderId: 'order-1', marketId: 'market-1', date: TUESDAY, lines, paymentId: 'pi_test_1' },
    });
    return accountId;
  }

  async function confirmPaymentAccount(): Promise<string> {
    await publishStorefrontFor(app, 'acme-bakery');
    await app.get(Subscriptions).drain();
    await vendor.startPaymentAccountRegistration(registration).expect(202);
    await app.get(Subscriptions).drain();
    const accountId = InMemoryPaymentAccounts.accountIdFor(registration.registrationId);
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
