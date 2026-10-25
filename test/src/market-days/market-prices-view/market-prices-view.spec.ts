import { DomainEvent, InMemoryCheckpoint, InMemoryEventStore, PollingSubscription } from '@market-miam/event-sourcing';
import { InMemoryMarketPricesViews, MarketPricesViewProjection } from '@market-miam/market-days';
import { calendarStream, marketPricesSet } from '../calendar-events';

describe('MarketPricesView', () => {
  let store: InMemoryEventStore;
  let views: InMemoryMarketPricesViews;
  let subscription: PollingSubscription;

  beforeEach(() => {
    store = new InMemoryEventStore();
    views = new InMemoryMarketPricesViews();
    subscription = new PollingSubscription(store, new MarketPricesViewProjection(views), new InMemoryCheckpoint('market-prices-view'));
  });

  // What vendor-1's calendar already holds.
  const given = (...history: DomainEvent[]): void =>
    store.seedWith(calendarStream('vendor-1'), history, { vendorId: 'vendor-1' });

  it('carries what a vendor charges at a market', async () => {
    given(marketPricesSet({ 'item-1': 1200 }, 'market-1'));

    await subscription.poll();

    expect(await views.forVendor('vendor-1')).toEqual([{ marketId: 'market-1', prices: { 'item-1': 1200 } }]);
  });

  it('replaces a market\'s prices rather than merging into them', async () => {
    given(marketPricesSet({ 'item-1': 1200 }, 'market-1'), marketPricesSet({ 'item-2': 900 }, 'market-1'));

    await subscription.poll();

    expect(await views.forVendor('vendor-1')).toEqual([{ marketId: 'market-1', prices: { 'item-2': 900 } }]);
  });

  it('keeps a vendor\'s markets apart', async () => {
    given(marketPricesSet({ 'item-1': 1200 }, 'market-1'), marketPricesSet({ 'item-1': 1500 }, 'market-2'));

    await subscription.poll();

    expect(await views.forVendor('vendor-1')).toEqual([
      { marketId: 'market-1', prices: { 'item-1': 1200 } },
      { marketId: 'market-2', prices: { 'item-1': 1500 } },
    ]);
  });

  it('carries nothing for a vendor who has priced nothing', async () => {
    given(marketPricesSet({ 'item-1': 1200 }, 'market-1'));

    await subscription.poll();

    expect(await views.forVendor('another-vendor')).toEqual([]);
  });

  it('empties a market the vendor has cleared', async () => {
    given(marketPricesSet({ 'item-1': 1200 }, 'market-1'), marketPricesSet({}, 'market-1'));

    await subscription.poll();

    expect(await views.forVendor('vendor-1')).toEqual([{ marketId: 'market-1', prices: {} }]);
  });
});
