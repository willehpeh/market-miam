import { InMemoryCheckpoint, PollingSubscription } from '@market-miam/event-sourcing';
import { InMemoryMarketDayViews, ItemOutcome, MarketDayView, MarketDayViewProjection } from '@market-miam/market-days';
import { SATURDAY, TODAY } from '../set-market-day-menu/test-data';
import { marketDayHarness } from '../market-day-harness';

describe('MarketDayView', () => {
  let views: InMemoryMarketDayViews;
  let projection: MarketDayViewProjection;
  let subscription: PollingSubscription;
  let setMenu: (date: string, ...itemIds: string[]) => Promise<void>;
  let markSoldOut: (date: string, itemId?: string) => Promise<void>;
  let markAvailable: (date: string, itemId?: string) => Promise<void>;
  let close: (date: string) => Promise<void>;
  let reopen: (date: string) => Promise<void>;
  let recordOutcome: (date: string, itemId: string, outcome: ItemOutcome) => Promise<void>;

  beforeEach(() => {
    const harness = marketDayHarness();
    ({ setMenu, markSoldOut, markAvailable, close, reopen, recordOutcome } = harness);
    views = new InMemoryMarketDayViews();
    projection = new MarketDayViewProjection(views);
    subscription = new PollingSubscription(harness.store, projection, new InMemoryCheckpoint('market-day-view'));
  });

  const menuOnSaturday = () => views.menusFor('vendor-1', SATURDAY, SATURDAY);

  // One shape, so a field added to the view lands here rather than in seven literals.
  const projected = (overrides: Partial<MarketDayView> = {}): MarketDayView =>
    ({ marketId: 'market-1', date: TODAY, itemIds: [], soldOutItemIds: [], outcomes: {}, closed: false, ...overrides });

  it('should project the menu a vendor set for a market day', async () => {
    await setMenu(SATURDAY, 'item-1', 'item-2');

    await subscription.poll();

    expect(await menuOnSaturday()).toEqual([
      projected({ date: SATURDAY, itemIds: ['item-1', 'item-2'] }),
    ]);
  });

  it('should project the latest menu when the day is set again', async () => {
    await setMenu(SATURDAY, 'item-1', 'item-2');
    await setMenu(SATURDAY, 'item-2');

    await subscription.poll();

    expect(await menuOnSaturday()).toEqual([
      projected({ date: SATURDAY, itemIds: ['item-2'] }),
    ]);
  });

  const menuToday = () => views.menusFor('vendor-1', TODAY, TODAY);

  it('projects a sold-out mark onto the day it was made', async () => {
    await setMenu(TODAY, 'item-1', 'item-2');
    await markSoldOut(TODAY);

    await subscription.poll();

    expect(await menuToday()).toEqual([
      projected({ itemIds: ['item-1', 'item-2'], soldOutItemIds: ['item-1'] }),
    ]);
  });

  // Slice 2b: the bilan lands on the same row as the availability it is judged against.
  it('projects what the vendor said about a dish', async () => {
    await setMenu(TODAY, 'item-1', 'item-2');
    await close(TODAY);
    await recordOutcome(TODAY, 'item-1', 'did_well');

    await subscription.poll();

    expect(await menuToday()).toEqual([
      projected({ itemIds: ['item-1', 'item-2'], outcomes: { 'item-1': 'did_well' }, closed: true }),
    ]);
  });

  // Decision 30: reopening means the day kept going, so every judgment about it is stale —
  // the read model forgets them exactly as the aggregate does.
  it('empties the bilan when the day reopens', async () => {
    await setMenu(TODAY, 'item-1');
    await close(TODAY);
    await recordOutcome(TODAY, 'item-1', 'did_well');
    await reopen(TODAY);

    await subscription.poll();

    expect(await menuToday()).toEqual([projected({ itemIds: ['item-1'] })]);
  });

  it('projects an item coming back as available', async () => {
    await setMenu(TODAY, 'item-1', 'item-2');
    await markSoldOut(TODAY);
    await markAvailable(TODAY);

    await subscription.poll();

    expect(await menuToday()).toEqual([
      projected({ itemIds: ['item-1', 'item-2'] }),
    ]);
  });

  it('projects a day the vendor closed as closed', async () => {
    await setMenu(TODAY, 'item-1');
    await close(TODAY);

    await subscription.poll();

    expect(await menuToday()).toEqual([
      projected({ itemIds: ['item-1'], closed: true }),
    ]);
  });

  it('projects a reopened day as open again', async () => {
    await setMenu(TODAY, 'item-1');
    await close(TODAY);
    await reopen(TODAY);

    await subscription.poll();

    expect(await menuToday()).toEqual([
      projected({ itemIds: ['item-1'] }),
    ]);
  });

  // The no-show door: a vendor whose van broke down closes a day they never planned, so
  // the close is the first thing the day's stream ever carried (decisions 40, 45).
  it('projects a day closed with no menu at all', async () => {
    await close(TODAY);

    await subscription.poll();

    expect(await menuToday()).toEqual([
      projected({ closed: true }),
    ]);
  });

  it('resets by clearing the read model so a replay rebuilds it from zero', async () => {
    await setMenu(SATURDAY, 'item-1', 'item-2');
    await subscription.poll();

    await projection.reset();

    expect(await menuOnSaturday()).toEqual([]);
  });
});
