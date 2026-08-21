import { MarketPricesView } from './market-prices-view';

export abstract class MarketPricesViewStore {
  abstract setPrices(prices: MarketPricesView, vendorId: string): Promise<void>;
  abstract clear(): Promise<void>;
}
