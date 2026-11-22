import { InMemoryEventStore } from '@market-miam/event-sourcing';
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

  it('places the order Stripe holds a card for', async () => {
    await handler.execute(TestPlaceOrder.valid());

    expect(store.newEvents()).toEqual([expect.objectContaining({ streamId: orderStream(), ...orderPlaced() })]);
  });
});
