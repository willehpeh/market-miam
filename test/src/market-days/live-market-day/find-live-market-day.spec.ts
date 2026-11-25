import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import { FindLiveMarketDay, FindLiveMarketDayHandler } from '@market-miam/market-days';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { available, menuSet, soldOut } from '../market-day-events';
import { TODAY } from '../set-market-day-menu/test-data';

describe('Find Live Market Day', () => {
  let store: InMemoryEventStore;
  let handler: FindLiveMarketDayHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new FindLiveMarketDayHandler(new VendorScopedEvents(store));
  });

  const given = (...history: DomainEvent[]): void =>
    store.seedWith(`market-day/vendor-1/market-1/${TODAY}`, history, { vendorId: 'vendor-1' });

  it('reports the day’s menu and its sold-out dishes, read from the day’s own events', async () => {
    given(menuSet(TODAY, 'item-1', 'item-2'), soldOut(TODAY, 'item-2'));

    expect(await handler.execute(new FindLiveMarketDay('vendor-1', 'market-1', TODAY))).toMatchObject({
      itemIds: ['item-1', 'item-2'],
      soldOutItemIds: ['item-2'],
    });
  });

  it('no longer reports a dish sold out once the vendor marks it available again', async () => {
    given(menuSet(TODAY, 'item-1', 'item-2'), soldOut(TODAY, 'item-2'), available(TODAY, 'item-2'));

    expect(await handler.execute(new FindLiveMarketDay('vendor-1', 'market-1', TODAY))).toMatchObject({
      soldOutItemIds: [],
    });
  });
});
