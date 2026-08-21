import { Observable } from 'rxjs';

// Sparse, exactly as the API answers: what a market's list does not name sells at the
// catalogue price, and a dish sold by variant is priced variant by variant.
export type PriceList = Record<string, number | Record<string, number>>;

export interface MarketPricesView {
  marketId: string;
  prices: PriceList;
}

export interface VendorMarketPricesView {
  markets: MarketPricesView[];
}

export abstract class MarketPrices {
  abstract list(): Observable<VendorMarketPricesView>;
  abstract set(marketId: string, prices: PriceList): Observable<void>;
}
