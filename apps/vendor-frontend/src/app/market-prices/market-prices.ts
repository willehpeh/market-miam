// Sparse, exactly as the API answers: what a market's list does not name sells at the
// catalogue price, and a dish sold by variant is priced variant by variant.
export type PriceList = Record<string, number | Record<string, number>>;

export interface MarketPricesView {
  marketId: string;
  prices: PriceList;
}
