import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { Instant, LocalDate } from '@market-miam/common';
import { Catalogues, MarketDays, SetMarketDayMenu, SetMarketDayMenuHandler, VendorScopedEvents } from '@market-miam/market-days';
import { seedCatalogue } from '../../seed-catalogue';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('Set Market Day Menu', () => {
  const TODAY = '2026-06-19';
  const SATURDAY = '2026-06-20';

  let store: InMemoryEventStore;
  let handler: SetMarketDayMenuHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    const events = new VendorScopedEvents(store);
    const marketDays = new MarketDays(events, {
      today: () => new LocalDate(TODAY),
      now: () => new Instant(`${TODAY}T09:00:00.000Z`),
    });
    seedCatalogue(store, 'vendor-1', 'item-1', 'item-2');
    handler = new SetMarketDayMenuHandler(marketDays, new Catalogues(events));
  });

  it('sets the menu for a market day', async () => {
    await handler.execute(new SetMarketDayMenu({
      vendorId: 'vendor-1',
      itemIds: ['item-1', 'item-2'],
      marketId: 'market-1',
      date: SATURDAY,
    }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketDayMenuSet',
        payload: { itemIds: ['item-1', 'item-2'], marketId: 'market-1', date: SATURDAY },
      }),
    ]);
  });

  it('stamps the vendor id into the event metadata', async () => {
    await handler.execute(new SetMarketDayMenu({
      vendorId: 'vendor-1',
      itemIds: ['item-1'],
      marketId: 'market-1',
      date: SATURDAY,
    }));

    expectVendorScopedEvents(store.newEvents(), 'vendor-1');
  });

  it('raises nothing when the menu is unchanged', async () => {
    const menu = { vendorId: 'vendor-1', itemIds: ['item-1', 'item-2'], marketId: 'market-1', date: SATURDAY };
    await handler.execute(new SetMarketDayMenu(menu));

    await handler.execute(new SetMarketDayMenu(menu));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketDayMenuSet',
        payload: { itemIds: ['item-1', 'item-2'], marketId: 'market-1', date: SATURDAY },
      }),
    ]);
  });
});
