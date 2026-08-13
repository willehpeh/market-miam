import { InMemoryCheckpoint, PollingSubscription } from '@market-miam/event-sourcing';
import { InMemoryMarketDayViews, MarketDayViewProjection } from '@market-miam/market-days';
import { SATURDAY, TODAY } from '../set-market-day-menu/test-data';
import { marketDayHarness } from '../market-day-harness';

describe('MarketDayView', () => {
  let views: InMemoryMarketDayViews;
  let projection: MarketDayViewProjection;
  let subscription: PollingSubscription;
  let setMenu: (date: string, ...itemIds: string[]) => Promise<void>;
  let markSoldOut: (date: string, itemId?: string) => Promise<void>;
  let markAvailable: (date: string, itemId?: string) => Promise<void>;

  beforeEach(() => {
    const harness = marketDayHarness();
    ({ setMenu, markSoldOut, markAvailable } = harness);
    views = new InMemoryMarketDayViews();
    projection = new MarketDayViewProjection(views);
    subscription = new PollingSubscription(harness.store, projection, new InMemoryCheckpoint('market-day-view'));
  });

  const menuOnSaturday = () => views.menusFor('vendor-1', SATURDAY, SATURDAY);

  it('should project the menu a vendor set for a market day', async () => {
    await setMenu(SATURDAY, 'item-1', 'item-2');

    await subscription.poll();

    expect(await menuOnSaturday()).toEqual([
      { marketId: 'market-1', date: SATURDAY, itemIds: ['item-1', 'item-2'], soldOutItemIds: [] },
    ]);
  });

  it('should project the latest menu when the day is set again', async () => {
    await setMenu(SATURDAY, 'item-1', 'item-2');
    await setMenu(SATURDAY, 'item-2');

    await subscription.poll();

    expect(await menuOnSaturday()).toEqual([
      { marketId: 'market-1', date: SATURDAY, itemIds: ['item-2'], soldOutItemIds: [] },
    ]);
  });

  const menuToday = () => views.menusFor('vendor-1', TODAY, TODAY);

  it('projects a sold-out mark onto the day it was made', async () => {
    await setMenu(TODAY, 'item-1', 'item-2');
    await markSoldOut(TODAY);

    await subscription.poll();

    expect(await menuToday()).toEqual([
      { marketId: 'market-1', date: TODAY, itemIds: ['item-1', 'item-2'], soldOutItemIds: ['item-1'] },
    ]);
  });

  it('projects an item coming back as available', async () => {
    await setMenu(TODAY, 'item-1', 'item-2');
    await markSoldOut(TODAY);
    await markAvailable(TODAY);

    await subscription.poll();

    expect(await menuToday()).toEqual([
      { marketId: 'market-1', date: TODAY, itemIds: ['item-1', 'item-2'], soldOutItemIds: [] },
    ]);
  });

  it('resets by clearing the read model so a replay rebuilds it from zero', async () => {
    await setMenu(SATURDAY, 'item-1', 'item-2');
    await subscription.poll();

    await projection.reset();

    expect(await menuOnSaturday()).toEqual([]);
  });
});
