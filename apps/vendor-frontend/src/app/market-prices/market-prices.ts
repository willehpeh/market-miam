import { Observable } from 'rxjs';

// What one dish costs at one market: a number for a flat dish, cents per variant name for a
// dish sold by variant (ADR 0052). Sparse — a variant it does not name keeps its catalogue price.
export type MarketPrice = number | Record<string, number>;

// Sparse, exactly as the API answers: what a market's list does not name sells at the
// catalogue price.
export type PriceList = Record<string, MarketPrice>;

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
