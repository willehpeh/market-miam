import { MarketPricesView } from './market-prices-view';

export abstract class MarketPricesViews {
  // Every vendor's markets in one read: the upcoming-days query expands a whole window
  // across several markets, so it joins prices once rather than once per occurrence.
  abstract forVendor(vendorId: string): Promise<MarketPricesView[]>;
}
