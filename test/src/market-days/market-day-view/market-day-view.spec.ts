import { DomainEvent, InMemoryCheckpoint, PollingSubscription } from '@market-miam/event-sourcing';
import { InMemoryMarketDayViews, MarketDayView, MarketDayViewProjection } from '@market-miam/market-days';
import { SATURDAY, TODAY } from '../set-market-day-menu/test-data';
import { marketDayHarness } from '../market-day-harness';
import { available, bilanRecorded, closed, menuSet, reopened, soldOut } from '../market-day-events';

describe('MarketDayView', () => {
  let views: InMemoryMarketDayViews;
  let projection: MarketDayViewProjection;
  let subscription: PollingSubscription;
  let given: (date: string, ...history: DomainEvent[]) => void;

  beforeEach(() => {
    const harness = marketDayHarness();
    ({ given } = harness);
    views = new InMemoryMarketDayViews();
    projection = new MarketDayViewProjection(views);
    subscription = new PollingSubscription(harness.store, projection, new InMemoryCheckpoint('market-day-view'));
  });

  const menuOnSaturday = () => views.menusFor('vendor-1', SATURDAY, SATURDAY);

  // One shape, so a field added to the view lands here rather than in seven literals.
  const projected = (overrides: Partial<MarketDayView> = {}): MarketDayView =>
    ({ marketId: 'market-1', date: TODAY, itemIds: [], soldOutItemIds: [], outcomes: {}, closed: false, ...overrides });

  it('should project the menu a vendor set for a market day', async () => {
    given(SATURDAY, menuSet(SATURDAY, 'item-1', 'item-2'));

    await subscription.poll();

    expect(await menuOnSaturday()).toEqual([
      projected({ date: SATURDAY, itemIds: ['item-1', 'item-2'] }),
    ]);
  });

  it('should project the latest menu when the day is set again', async () => {
    given(SATURDAY, menuSet(SATURDAY, 'item-1', 'item-2'), menuSet(SATURDAY, 'item-2'));

    await subscription.poll();

    expect(await menuOnSaturday()).toEqual([
      projected({ date: SATURDAY, itemIds: ['item-2'] }),
    ]);
  });

  const menuToday = () => views.menusFor('vendor-1', TODAY, TODAY);

  it('projects a sold-out mark onto the day it was made', async () => {
    given(TODAY, menuSet(TODAY, 'item-1', 'item-2'), soldOut(TODAY));

    await subscription.poll();

    expect(await menuToday()).toEqual([
      projected({ itemIds: ['item-1', 'item-2'], soldOutItemIds: ['item-1'] }),
    ]);
  });

  // Slice 2b: the bilan lands on the same row as the availability it is judged against.
  it('projects what the vendor said about a dish', async () => {
    given(TODAY, menuSet(TODAY, 'item-1', 'item-2'), closed(TODAY), bilanRecorded(TODAY, { 'item-1': 'did_well' }));

    await subscription.poll();

    expect(await menuToday()).toEqual([
      projected({ itemIds: ['item-1', 'item-2'], outcomes: { 'item-1': 'did_well' }, closed: true, closedAt: '11:00' }),
    ]);
  });

  // Decision 30: reopening means the day kept going, so every judgment about it is stale —
  // the read model forgets them exactly as the aggregate does.
  it('empties the bilan when the day reopens', async () => {
    given(TODAY, menuSet(TODAY, 'item-1'), closed(TODAY), bilanRecorded(TODAY, { 'item-1': 'did_well' }), reopened(TODAY));

    await subscription.poll();

    expect(await menuToday()).toEqual([projected({ itemIds: ['item-1'] })]);
  });

  it('projects an item coming back as available', async () => {
    given(TODAY, menuSet(TODAY, 'item-1', 'item-2'), soldOut(TODAY), available(TODAY));

    await subscription.poll();

    expect(await menuToday()).toEqual([
      projected({ itemIds: ['item-1', 'item-2'] }),
    ]);
  });

  it('projects a day the vendor closed as closed', async () => {
    given(TODAY, menuSet(TODAY, 'item-1'), closed(TODAY));

    await subscription.poll();

    expect(await menuToday()).toEqual([
      projected({ itemIds: ['item-1'], closed: true, closedAt: '11:00' }),
    ]);
  });

  it('projects a reopened day as open again', async () => {
    given(TODAY, menuSet(TODAY, 'item-1'), closed(TODAY), reopened(TODAY));

    await subscription.poll();

    expect(await menuToday()).toEqual([
      projected({ itemIds: ['item-1'] }),
    ]);
  });

  // The no-show door: a vendor whose van broke down closes a day they never planned, so
  // the close is the first thing the day's stream ever carried (decisions 40, 45).
  it('projects a day closed with no menu at all', async () => {
    given(TODAY, closed(TODAY));

    await subscription.poll();

    expect(await menuToday()).toEqual([
      projected({ closed: true, closedAt: '11:00' }),
    ]);
  });

  it('resets by clearing the read model so a replay rebuilds it from zero', async () => {
    given(SATURDAY, menuSet(SATURDAY, 'item-1', 'item-2'));
    await subscription.poll();

    await projection.reset();

    expect(await menuOnSaturday()).toEqual([]);
  });
});
