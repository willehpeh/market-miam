import { InMemoryCheckpoint, InMemoryEventStore, PollingSubscription } from '@market-miam/event-sourcing';
import { Instant, LocalDate } from '@market-miam/common';
import {
  Catalogues,
  InMemoryMarketDayViews,
  MarketDays,
  MarketDayViewProjection,
  SetMarketDayMenuHandler,
  VendorScopedEvents,
} from '@market-miam/market-days';
import { SATURDAY, TestSetMarketDayMenu, TODAY } from '../set-market-day-menu/test-data';
import { seedCatalogue } from '../../seed-catalogue';

describe('MarketDayView', () => {
  let views: InMemoryMarketDayViews;
  let projection: MarketDayViewProjection;
  let subscription: PollingSubscription;
  let handler: SetMarketDayMenuHandler;

  beforeEach(() => {
    const store = new InMemoryEventStore();
    const events = new VendorScopedEvents(store);
    const marketDays = new MarketDays(events, {
      today: () => new LocalDate(TODAY),
      now: () => new Instant(`${TODAY}T09:00:00.000Z`),
    });
    seedCatalogue(store, 'vendor-1', 'item-1', 'item-2');
    views = new InMemoryMarketDayViews();
    projection = new MarketDayViewProjection(views);
    subscription = new PollingSubscription(store, projection, new InMemoryCheckpoint('market-day-view'));
    handler = new SetMarketDayMenuHandler(marketDays, new Catalogues(events));
  });

  const menuOnSaturday = () => views.menusFor('vendor-1', SATURDAY, SATURDAY);

  it('should project the menu a vendor set for a market day', async () => {
    await handler.execute(TestSetMarketDayMenu.valid());

    await subscription.poll();

    expect(await menuOnSaturday()).toEqual([
      { marketId: 'market-1', date: SATURDAY, itemIds: ['item-1', 'item-2'] },
    ]);
  });

  it('should project the latest menu when the day is set again', async () => {
    await handler.execute(TestSetMarketDayMenu.valid());
    await handler.execute(TestSetMarketDayMenu.with({ itemIds: ['item-2'] }));

    await subscription.poll();

    expect(await menuOnSaturday()).toEqual([
      { marketId: 'market-1', date: SATURDAY, itemIds: ['item-2'] },
    ]);
  });

  it('resets by clearing the read model so a replay rebuilds it from zero', async () => {
    await handler.execute(TestSetMarketDayMenu.valid());
    await subscription.poll();

    await projection.reset();

    expect(await menuOnSaturday()).toEqual([]);
  });
});
