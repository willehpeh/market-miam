import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import { Orders, PlaceOrderHandler } from '@market-miam/ordering';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { orderPlaced, orderStream } from '../order-events';
import { TestPlaceOrder } from './test-data';

describe('Place Order', () => {
  let store: InMemoryEventStore;
  let handler: PlaceOrderHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new PlaceOrderHandler(new Orders(new VendorScopedEvents(store)));
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
});
