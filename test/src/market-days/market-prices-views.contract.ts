import { beforeEach, describe, expect, it } from 'vitest';
import { MarketPricesView, MarketPricesViews, MarketPricesViewStore } from '@market-miam/market-days';

type Store = MarketPricesViews & MarketPricesViewStore;

const prices = (overrides: Partial<MarketPricesView> = {}): MarketPricesView => ({
  marketId: 'market-1',
  prices: { 'item-1': 1200 },
  ...overrides,
});

export function marketPricesViewsContract(name: string, create: () => Store): void {
  describe(`MarketPricesViews contract: ${ name }`, () => {
    let store: Store;

    beforeEach(() => {
      store = create();
    });

    it('has no prices for a vendor who has priced nothing', async () => {
      expect(await store.forVendor('nobody')).toEqual([]);
    });

    it('carries a market\'s prices', async () => {
      await store.setPrices(prices(), 'v1');

      expect(await store.forVendor('v1')).toEqual([prices()]);
    });

    it('carries a price per variant', async () => {
      const perVariant = prices({ prices: { pizza: { Margherita: 1100, Pepperoni: 1400 } } });
      await store.setPrices(perVariant, 'v1');

      expect(await store.forVendor('v1')).toEqual([perVariant]);
    });

    it('replaces a market\'s prices rather than merging into them', async () => {
      await store.setPrices(prices(), 'v1');

      await store.setPrices(prices({ prices: { 'item-2': 900 } }), 'v1');

      expect(await store.forVendor('v1')).toEqual([prices({ prices: { 'item-2': 900 } })]);
    });

    it('empties a market that has been cleared', async () => {
      await store.setPrices(prices(), 'v1');

      await store.setPrices(prices({ prices: {} }), 'v1');

      expect(await store.forVendor('v1')).toEqual([prices({ prices: {} })]);
    });

    it('keeps a vendor\'s markets apart, in market order', async () => {
      await store.setPrices(prices({ marketId: 'market-2', prices: { 'item-1': 1500 } }), 'v1');
      await store.setPrices(prices(), 'v1');

      expect(await store.forVendor('v1')).toEqual([
        prices(),
        prices({ marketId: 'market-2', prices: { 'item-1': 1500 } }),
      ]);
    });

    it('keeps vendors apart', async () => {
      await store.setPrices(prices(), 'v1');

      expect(await store.forVendor('v2')).toEqual([]);
    });

    it('clears every vendor for a rebuild', async () => {
      await store.setPrices(prices(), 'v1');

      await store.clear();

      expect(await store.forVendor('v1')).toEqual([]);
    });
  });
}
