import { InMemoryCheckpoint, InMemoryEventStore, PollingSubscription } from '@market-miam/event-sourcing';
import {
  Catalogues,
  InMemoryMarketDayViews,
  MarketDays,
  MarketDayViewProjection,
  MarkItemAsAvailable,
  MarkItemAsAvailableHandler,
  MarkItemAsSoldOut,
  MarkItemAsSoldOutHandler,
  SetMarketDayMenuHandler,
  VendorScopedEvents,
} from '@market-miam/market-days';
import { SATURDAY, TestSetMarketDayMenu, TODAY } from '../set-market-day-menu/test-data';
import { seedCatalogue } from '../../seed-catalogue';
import { clockAt } from '../../clock-at';

describe('MarketDayView', () => {
  let views: InMemoryMarketDayViews;
  let projection: MarketDayViewProjection;
  let subscription: PollingSubscription;
  let handler: SetMarketDayMenuHandler;
  let soldOut: MarkItemAsSoldOutHandler;
  let available: MarkItemAsAvailableHandler;

  beforeEach(() => {
    const store = new InMemoryEventStore();
    const events = new VendorScopedEvents(store);
    const clock = clockAt(TODAY);
    const marketDays = new MarketDays(events, clock);
    seedCatalogue(store, 'vendor-1', 'item-1', 'item-2');
    views = new InMemoryMarketDayViews();
    projection = new MarketDayViewProjection(views);
    subscription = new PollingSubscription(store, projection, new InMemoryCheckpoint('market-day-view'));
    handler = new SetMarketDayMenuHandler(marketDays, new Catalogues(events));
    soldOut = new MarkItemAsSoldOutHandler(marketDays, clock);
    available = new MarkItemAsAvailableHandler(marketDays, clock);
  });

  const menuOnSaturday = () => views.menusFor('vendor-1', SATURDAY, SATURDAY);

  it('should project the menu a vendor set for a market day', async () => {
    await handler.execute(TestSetMarketDayMenu.valid());

    await subscription.poll();

    expect(await menuOnSaturday()).toEqual([
      { marketId: 'market-1', date: SATURDAY, itemIds: ['item-1', 'item-2'], soldOutItemIds: [] },
    ]);
  });

  it('should project the latest menu when the day is set again', async () => {
    await handler.execute(TestSetMarketDayMenu.valid());
    await handler.execute(TestSetMarketDayMenu.with({ itemIds: ['item-2'] }));

    await subscription.poll();

    expect(await menuOnSaturday()).toEqual([
      { marketId: 'market-1', date: SATURDAY, itemIds: ['item-2'], soldOutItemIds: [] },
    ]);
  });

  const menuToday = () => views.menusFor('vendor-1', TODAY, TODAY);

  it('projects a sold-out mark onto the day it was made', async () => {
    await handler.execute(TestSetMarketDayMenu.with({ date: TODAY }));
    await soldOut.execute(new MarkItemAsSoldOut('vendor-1', 'item-1', 'market-1', TODAY));

    await subscription.poll();

    expect(await menuToday()).toEqual([
      { marketId: 'market-1', date: TODAY, itemIds: ['item-1', 'item-2'], soldOutItemIds: ['item-1'] },
    ]);
  });

  it('projects an item coming back as available', async () => {
    await handler.execute(TestSetMarketDayMenu.with({ date: TODAY }));
    await soldOut.execute(new MarkItemAsSoldOut('vendor-1', 'item-1', 'market-1', TODAY));
    await available.execute(new MarkItemAsAvailable('vendor-1', 'item-1', 'market-1', TODAY));

    await subscription.poll();

    expect(await menuToday()).toEqual([
      { marketId: 'market-1', date: TODAY, itemIds: ['item-1', 'item-2'], soldOutItemIds: [] },
    ]);
  });

  it('resets by clearing the read model so a replay rebuilds it from zero', async () => {
    await handler.execute(TestSetMarketDayMenu.valid());
    await subscription.poll();

    await projection.reset();

    expect(await menuOnSaturday()).toEqual([]);
  });
});
