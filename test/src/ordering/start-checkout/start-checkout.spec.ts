import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  BasketLine,
  BasketOverCapError,
  BasketRefusedError,
  InMemoryPayments,
  InMemoryPublishedStorefronts,
  InMemoryTradingDays,
  MalformedBasketError,
  MerchantCannotTakePaymentsError,
  Merchants,
  RefusalReason,
  StartCheckout,
  StartCheckoutHandler,
  StorefrontNotPublishedError,
} from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { clockAt } from '../../clock-at';
import { accountDisabled, accountEnabled, merchantStream, registrationConfirmed, registrationStarted } from '../merchant-events';

const TODAY = '2026-11-21';
const NOW = `${TODAY}T10:12:00.000Z`;

describe('Start Checkout', () => {
  let store: InMemoryEventStore;
  let payments: InMemoryPayments;
  let tradingDays: InMemoryTradingDays;
  let storefronts: InMemoryPublishedStorefronts;
  let handler: StartCheckoutHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    store.seedWith(merchantStream(), [registrationStarted(), registrationConfirmed(), accountEnabled()], { vendorId: 'vendor-id' });
    payments = new InMemoryPayments();
    tradingDays = new InMemoryTradingDays();
    tradingDays.setMenu('dish-id', 'another-dish-id');
    tradingDays.setPrice('dish-id', 1250);
    tradingDays.setPrice('another-dish-id', 900);
    storefronts = new InMemoryPublishedStorefronts();
    storefronts.publishAt('acme-bakery', 'vendor-id');
    storefronts.publishAt('other-bakery', 'vendor-2');
    handler = new StartCheckoutHandler(storefronts, payments, tradingDays, new Merchants(new VendorScopedEvents(store)), clockAt(TODAY, NOW));
  });

  it('starts a checkout for a basket of today’s dishes on the account of the vendor publishing at the subdomain, and answers its address', async () => {
    const address = await handler.execute(
      new StartCheckout('acme-bakery', 'market-id', [
        { dishId: 'dish-id', quantity: 2 },
        { dishId: 'another-dish-id', quantity: 1 },
      ]),
    );

    expect(payments.checkoutAt(address)).toEqual({
      accountId: 'acct_test_1',
      orderId: expect.any(String),
      vendorId: 'vendor-id',
      marketId: 'market-id',
      date: TODAY,
      lines: [
        { dishId: 'dish-id', quantity: 2, unitPrice: 1250 },
        { dishId: 'another-dish-id', quantity: 1, unitPrice: 900 },
      ],
      expiresAt: `${TODAY}T10:42:00.000Z`,
    });
  });

  it('refuses a checkout at a subdomain where no storefront is published', async () => {
    await expect(
      handler.execute(new StartCheckout('nobody-bakery', 'market-id', [{ dishId: 'dish-id', quantity: 1 }])),
    ).rejects.toThrow(StorefrontNotPublishedError);
  });

  it.each<[string, DomainEvent[]]>([
    ['has no payment account', []],
    ['is still registering its account', [registrationStarted('vendor-2')]],
    ['has an account not yet taking card payments', [registrationStarted('vendor-2'), registrationConfirmed('vendor-2')]],
    [
      'had its account disabled',
      [registrationStarted('vendor-2'), registrationConfirmed('vendor-2'), accountEnabled('vendor-2'), accountDisabled('vendor-2')],
    ],
  ])('refuses to start a checkout when the vendor %s', async (_, history) => {
    store.seedWith(merchantStream('vendor-2'), history, { vendorId: 'vendor-2' });

    await expect(
      handler.execute(new StartCheckout('other-bakery', 'market-id', [{ dishId: 'dish-id', quantity: 1 }])),
    ).rejects.toThrow(MerchantCannotTakePaymentsError);
  });

  it.each<[RefusalReason, string, (days: InMemoryTradingDays) => void]>([
    ['not-yet-open', 'before its market opens', days => days.beforeOpening()],
    ['closed', 'once the vendor has closed it by hand', days => days.close()],
    ['ended', 'once its market has ended', days => days.end()],
    ['closed', 'when no schedule puts the vendor at the market today', days => days.unschedule()],
    ['sold-out', 'once one of its dishes has sold out', days => days.markSoldOut('another-dish-id')],
    ['sold-out', 'once one of its dishes has left the menu', days => days.setMenu('dish-id')],
  ])('refuses the basket as %s %s', async (reason, _, arrange) => {
    arrange(tradingDays);

    const refusal = handler.execute(
      new StartCheckout('acme-bakery', 'market-id', [
        { dishId: 'dish-id', quantity: 1 },
        { dishId: 'another-dish-id', quantity: 1 },
      ]),
    );

    await expect(refusal).rejects.toThrow(BasketRefusedError);
    await expect(refusal).rejects.toMatchObject({ reason });
  });

  it('refuses a basket costing 120 € or more', async () => {
    tradingDays.setPrice('dish-id', 4000);

    await expect(
      handler.execute(new StartCheckout('acme-bakery', 'market-id', [{ dishId: 'dish-id', quantity: 3 }])),
    ).rejects.toThrow(BasketOverCapError);
  });

  it('starts a checkout for a basket costing exactly 119,99 €', async () => {
    tradingDays.setPrice('dish-id', 11999);

    const address = await handler.execute(new StartCheckout('acme-bakery', 'market-id', [{ dishId: 'dish-id', quantity: 1 }]));

    expect(payments.checkoutAt(address)).toMatchObject({ lines: [{ dishId: 'dish-id', quantity: 1, unitPrice: 11999 }] });
  });

  it.each<[string, BasketLine[]]>([
    ['an empty basket', []],
    ['a basket asking for none of a dish', [{ dishId: 'dish-id', quantity: 0 }]],
  ])('refuses %s as malformed', async (_, basket) => {
    await expect(handler.execute(new StartCheckout('acme-bakery', 'market-id', basket))).rejects.toThrow(MalformedBasketError);
  });

  it.each<[string, BasketLine]>([
    ['a dish with variants and none chosen', { dishId: 'pizza-id', quantity: 1 }],
    ['a variant the dish doesn’t have', { dishId: 'pizza-id', variant: 'Calzone', quantity: 1 }],
    ['a variant on a dish without any', { dishId: 'dish-id', variant: 'Large', quantity: 1 }],
  ])('refuses as sold-out a basket naming %s', async (_, line) => {
    tradingDays.setMenu('dish-id', 'pizza-id');
    tradingDays.setVariantPrice('pizza-id', 'Margherita', 900);

    const refusal = handler.execute(new StartCheckout('acme-bakery', 'market-id', [line]));

    await expect(refusal).rejects.toThrow(BasketRefusedError);
    await expect(refusal).rejects.toMatchObject({ reason: 'sold-out' });
  });

  it('gives each checkout a new order ID', async () => {
    const basket = [{ dishId: 'dish-id', quantity: 1 }];

    const first = await handler.execute(new StartCheckout('acme-bakery', 'market-id', basket));
    const second = await handler.execute(new StartCheckout('acme-bakery', 'market-id', basket));

    expect(payments.checkoutAt(first)?.orderId).not.toEqual(payments.checkoutAt(second)?.orderId);
  });

  it('records nothing, an order existing only once Stripe holds its card', async () => {
    await handler.execute(new StartCheckout('acme-bakery', 'market-id', [{ dishId: 'dish-id', quantity: 1 }]));

    expect(store.newEvents()).toEqual([]);
  });

  it('prices a dish with variants by the variant chosen', async () => {
    tradingDays.setMenu('dish-id', 'pizza-id');
    tradingDays.setVariantPrice('pizza-id', 'Margherita', 900);
    tradingDays.setVariantPrice('pizza-id', 'Pepperoni', 1200);

    const address = await handler.execute(
      new StartCheckout('acme-bakery', 'market-id', [{ dishId: 'pizza-id', variant: 'Pepperoni', quantity: 1 }]),
    );

    expect(payments.checkoutAt(address)).toMatchObject({
      lines: [{ dishId: 'pizza-id', variant: 'Pepperoni', quantity: 1, unitPrice: 1200 }],
    });
  });
});
