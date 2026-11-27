import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  BasketRefusedError,
  InMemoryPayments,
  InMemoryTradingDays,
  MerchantCannotTakePaymentsError,
  Merchants,
  RefusalReason,
  StartCheckout,
  StartCheckoutHandler,
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
  let handler: StartCheckoutHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    store.seedWith(merchantStream(), [registrationStarted(), registrationConfirmed(), accountEnabled()], { vendorId: 'vendor-id' });
    payments = new InMemoryPayments();
    tradingDays = new InMemoryTradingDays();
    tradingDays.setMenu('dish-id', 'another-dish-id');
    tradingDays.setPrice('dish-id', 1250);
    tradingDays.setPrice('another-dish-id', 900);
    handler = new StartCheckoutHandler(payments, tradingDays, new Merchants(new VendorScopedEvents(store)), clockAt(TODAY, NOW));
  });

  it('starts a checkout for a basket of today’s dishes on the vendor’s account, and answers its address', async () => {
    const address = await handler.execute(
      new StartCheckout('vendor-id', 'market-id', [
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
      handler.execute(new StartCheckout('vendor-2', 'market-id', [{ dishId: 'dish-id', quantity: 1 }])),
    ).rejects.toThrow(MerchantCannotTakePaymentsError);
  });

  it.each<[RefusalReason, string, (days: InMemoryTradingDays) => void]>([
    ['not-yet-open', 'before its market opens', days => days.beforeOpening()],
    ['closed', 'once the vendor has closed it by hand', days => days.close()],
    ['ended', 'once its market has ended', days => days.end()],
    ['closed', 'when no schedule puts the vendor at the market today', days => days.unschedule()],
  ])('refuses the basket as %s %s', async (reason, _, arrange) => {
    arrange(tradingDays);

    const refusal = handler.execute(new StartCheckout('vendor-id', 'market-id', [{ dishId: 'dish-id', quantity: 1 }]));

    await expect(refusal).rejects.toThrow(BasketRefusedError);
    await expect(refusal).rejects.toMatchObject({ reason });
  });

  it('prices a dish with variants by the variant chosen', async () => {
    tradingDays.setMenu('dish-id', 'pizza-id');
    tradingDays.setVariantPrice('pizza-id', 'Margherita', 900);
    tradingDays.setVariantPrice('pizza-id', 'Pepperoni', 1200);

    const address = await handler.execute(
      new StartCheckout('vendor-id', 'market-id', [{ dishId: 'pizza-id', variant: 'Pepperoni', quantity: 1 }]),
    );

    expect(payments.checkoutAt(address)).toMatchObject({
      lines: [{ dishId: 'pizza-id', variant: 'Pepperoni', quantity: 1, unitPrice: 1200 }],
    });
  });
});
