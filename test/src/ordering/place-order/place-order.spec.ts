import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import { InMemoryTradingDays, Orders, PlaceOrderHandler } from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { orderPlaced, orderRefused, orderStream } from '../order-events';
import { TestPlaceOrder } from './test-data';

describe('Place Order', () => {
  let store: InMemoryEventStore;
  let tradingDays: InMemoryTradingDays;
  let handler: PlaceOrderHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    tradingDays = new InMemoryTradingDays();
    tradingDays.setMenu('dish-id', 'another-dish-id');
    handler = new PlaceOrderHandler(new Orders(new VendorScopedEvents(store)), tradingDays);
  });

  const given = (...history: DomainEvent[]): void => store.seedWith(orderStream(), history, { vendorId: 'vendor-id' });

  it('places the order Stripe holds a card for', async () => {
    await handler.execute(TestPlaceOrder.valid());

    expect(store.newEvents()).toEqual([expect.objectContaining({ streamId: orderStream(), ...orderPlaced() })]);
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

  it('refuses the order when the vendor closed the day while the customer paid', async () => {
    tradingDays.close();

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
