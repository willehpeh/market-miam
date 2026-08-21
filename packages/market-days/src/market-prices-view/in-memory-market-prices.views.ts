import { MarketPricesView } from './market-prices-view';
import { MarketPricesViews } from './market-prices-views';
import { MarketPricesViewStore } from './market-prices-view.store';

export class InMemoryMarketPricesViews implements MarketPricesViews, MarketPricesViewStore {
  private readonly byVendor = new Map<string, Map<string, MarketPricesView>>();

  // Replaces rather than merges: a market's prices are set whole (ADR 0052), so a submit
  // that drops a dish drops it here too.
  async setPrices(prices: MarketPricesView, vendorId: string): Promise<void> {
    const forVendor = this.byVendor.get(vendorId) ?? new Map<string, MarketPricesView>();
    forVendor.set(prices.marketId, this.copyOf(prices));
    this.byVendor.set(vendorId, forVendor);
  }

  async clear(): Promise<void> {
    this.byVendor.clear();
  }

  async forVendor(vendorId: string): Promise<MarketPricesView[]> {
    return [...this.byVendor.get(vendorId)?.values() ?? []]
      .map(prices => this.copyOf(prices))
      .sort((a, b) => a.marketId.localeCompare(b.marketId));
  }

  // Copied both ways, like the market-day store: sharing a map with a writer or a reader
  // would let a caller mutating its prices silently mutate the store.
  private copyOf(prices: MarketPricesView): MarketPricesView {
    return { marketId: prices.marketId, prices: { ...prices.prices } };
  }
}
