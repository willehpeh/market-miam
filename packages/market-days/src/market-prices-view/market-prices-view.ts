import { PriceList } from '../calendar';

// One market's overrides, as the vendor last set them whole. Sparse: what it does not
// name sells at the catalogue price (ADR 0052).
export type MarketPricesView = {
  marketId: string;
  prices: PriceList;
};
