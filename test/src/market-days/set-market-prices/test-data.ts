import { SetMarketPrices } from '@market-miam/market-days';

export class TestSetMarketPrices {
  static valid(): SetMarketPrices {
    return new SetMarketPrices({
      vendorId: 'vendor-1',
      marketId: 'market-1',
      prices: { 'item-1': 1200 },
    });
  }

  static with(overrides: Partial<SetMarketPrices>): SetMarketPrices {
    const defaults = this.valid();
    return new SetMarketPrices({
      vendorId: overrides.vendorId ?? defaults.vendorId,
      marketId: overrides.marketId ?? defaults.marketId,
      prices: overrides.prices ?? defaults.prices,
    });
  }
}
