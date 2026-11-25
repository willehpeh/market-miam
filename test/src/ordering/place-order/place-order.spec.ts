import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import { InMemoryPayments, InMemoryTradingDays, Merchants, Orders, PlaceOrderHandler } from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { merchantStream, registrationConfirmed, registrationStarted } from '../merchant-events';
import { orderPlaced, orderRefused, orderStream } from '../order-events';
import { TestCompletedCheckout, TestPlaceOrder } from './test-data';

describe('Place Order', () => {
  let store: InMemoryEventStore;
  let tradingDays: InMemoryTradingDays;
  let handler: PlaceOrderHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    tradingDays = new InMemoryTradingDays();
    tradingDays.setMenu('dish-id', 'another-dish-id');
    store.seedWith(merchantStream(), [registrationStarted(), registrationConfirmed()], { vendorId: 'vendor-id' });
    const payments = new InMemoryPayments();
    payments.complete('cs_test_1', TestCompletedCheckout.valid());
    const events = new VendorScopedEvents(store);
    handler = new PlaceOrderHandler(payments, new Orders(events), tradingDays, new Merchants(events));
  });

  const given = (...history: DomainEvent[]): void => store.seedWith(orderStream(), history, { vendorId: 'vendor-id' });

  it('places the order Stripe holds a card for', async () => {
    await handler.execute(TestPlaceOrder.valid());

    expect(store.newEvents()).toEqual([expect.objectContaining({ streamId: orderStream(), ...orderPlaced() })]);
  });

  it('records nothing when Stripe holds the card on an account other than the vendor’s current one', async () => {
    await handler.execute(TestPlaceOrder.with({ accountId: 'acct_left_over' }));

    expect(store.newEvents()).toEqual([]);
  });

  it('records nothing when Stripe sends the same hold again', async () => {
    given(orderPlaced());

    await handler.execute(TestPlaceOrder.valid());

    expect(store.newEvents()).toEqual([]);
  });

  it('refuses the whole order when one of its dishes sold out while the customer paid', async () => {
    tradingDays.markSoldOut('another-dish-id');

    await handler.execute(TestPlaceOrder.valid());

    expect(store.newEvents()).toEqual([expect.objectContaining({ streamId: orderStream(), ...orderRefused() })]);
  });

  it('refuses the order as sold out when the vendor took one of its dishes off the menu while the customer paid', async () => {
    tradingDays.setMenu('dish-id');

    await handler.execute(TestPlaceOrder.valid());

    expect(store.newEvents()).toEqual([expect.objectContaining({ streamId: orderStream(), ...orderRefused() })]);
  });

  it('refuses the order when the vendor closed the day while the customer paid', async () => {
    tradingDays.close();

    await handler.execute(TestPlaceOrder.valid());

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ streamId: orderStream(), ...orderRefused({ reason: 'closed' }) }),
    ]);
  });

  it('refuses the order as closed when the vendor is no longer scheduled at the market that day', async () => {
    tradingDays.unschedule();

    await handler.execute(TestPlaceOrder.valid());

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ streamId: orderStream(), ...orderRefused({ reason: 'closed' }) }),
    ]);
  });

  it('refuses for the closed day rather than a sold-out dish when both apply', async () => {
    tradingDays.markSoldOut('another-dish-id');
    tradingDays.close();

    await handler.execute(TestPlaceOrder.valid());

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ streamId: orderStream(), ...orderRefused({ reason: 'closed' }) }),
    ]);
  });

  it('refuses the order when the market day ended while the customer paid', async () => {
    tradingDays.end();

    await handler.execute(TestPlaceOrder.valid());

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ streamId: orderStream(), ...orderRefused({ reason: 'ended' }) }),
    ]);
  });

  it('records nothing when Stripe sends a placed order’s hold again after its dish sold out', async () => {
    given(orderPlaced());
    tradingDays.markSoldOut('another-dish-id');

    await handler.execute(TestPlaceOrder.valid());

    expect(store.newEvents()).toEqual([]);
  });

  it('records nothing when Stripe sends a refused order’s hold again', async () => {
    given(orderRefused());

    await handler.execute(TestPlaceOrder.valid());

    expect(store.newEvents()).toEqual([]);
  });
});
