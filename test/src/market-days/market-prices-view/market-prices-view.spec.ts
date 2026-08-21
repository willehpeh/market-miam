import { InMemoryCheckpoint, InMemoryEventStore, PollingSubscription } from '@market-miam/event-sourcing';
import {
  Calendars,
  Catalogues,
  InMemoryMarketPricesViews,
  MarketPricesViewProjection,
  MarketScheduleRegistered,
  SetMarketPrices,
  SetMarketPricesHandler,
  VendorScopedEvents
} from '@market-miam/market-days';
import { seedCatalogue } from '../../seed-catalogue';

function seedSchedule(store: InMemoryEventStore, marketId: string, scheduleId: string) {
  const registered: MarketScheduleRegistered = {
    type: 'MarketScheduleRegistered',
    payload: {
      market: { id: marketId, name: 'Marché', codePostal: '75011', town: 'Paris' },
      scheduleId,
      startDate: '2026-06-01',
      days: [{ day: 'SAT', startTime: '08:00', endTime: '14:00' }],
      frequency: { weeks: 1 },
    },
    version: 1,
  };
  store.seedWith(`calendar-vendor-1`, [registered], { vendorId: 'vendor-1' });
}

describe('MarketPricesView', () => {
  let store: InMemoryEventStore;
  let views: InMemoryMarketPricesViews;
  let subscription: PollingSubscription;
  let handler: SetMarketPricesHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    const events = new VendorScopedEvents(store);
    seedCatalogue(store, 'vendor-1', 'item-1', 'item-2');
    seedSchedule(store, 'market-1', 'schedule-1');
    views = new InMemoryMarketPricesViews();
    subscription = new PollingSubscription(store, new MarketPricesViewProjection(views), new InMemoryCheckpoint('market-prices-view'));
    handler = new SetMarketPricesHandler(new Calendars(events), new Catalogues(events));
  });

  const setPrices = (prices: Record<string, number | Record<string, number>>, marketId = 'market-1') =>
    handler.execute(new SetMarketPrices({ vendorId: 'vendor-1', marketId, prices }));

  it('carries what a vendor charges at a market', async () => {
    await setPrices({ 'item-1': 1200 });

    await subscription.poll();

    expect(await views.forVendor('vendor-1')).toEqual([{ marketId: 'market-1', prices: { 'item-1': 1200 } }]);
  });

  it('replaces a market\'s prices rather than merging into them', async () => {
    await setPrices({ 'item-1': 1200 });

    await setPrices({ 'item-2': 900 });
    await subscription.poll();

    expect(await views.forVendor('vendor-1')).toEqual([{ marketId: 'market-1', prices: { 'item-2': 900 } }]);
  });

  it('keeps a vendor\'s markets apart', async () => {
    seedSchedule(store, 'market-2', 'schedule-2');

    await setPrices({ 'item-1': 1200 }, 'market-1');
    await setPrices({ 'item-1': 1500 }, 'market-2');
    await subscription.poll();

    expect(await views.forVendor('vendor-1')).toEqual([
      { marketId: 'market-1', prices: { 'item-1': 1200 } },
      { marketId: 'market-2', prices: { 'item-1': 1500 } },
    ]);
  });

  it('carries nothing for a vendor who has priced nothing', async () => {
    await setPrices({ 'item-1': 1200 });

    await subscription.poll();

    expect(await views.forVendor('another-vendor')).toEqual([]);
  });

  it('empties a market the vendor has cleared', async () => {
    await setPrices({ 'item-1': 1200 });

    await setPrices({});
    await subscription.poll();

    expect(await views.forVendor('vendor-1')).toEqual([{ marketId: 'market-1', prices: {} }]);
  });
});
