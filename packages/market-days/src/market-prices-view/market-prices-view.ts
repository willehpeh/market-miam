import { PriceList } from '../calendar';

// One market's overrides, as the vendor last set them whole. Sparse: what it does not
// name sells at the catalogue price (ADR 0052).
export type MarketPricesView = {
  marketId: string;
  prices: PriceList;
};

// The whole set the editor loads: every market this vendor prices, in market order.
export type VendorMarketPricesView = {
  markets: MarketPricesView[];
};
