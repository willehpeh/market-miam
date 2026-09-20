import { HideCartePrices } from '@market-miam/market-days';

export class TestHideCartePrices {
  static valid(): HideCartePrices {
    return new HideCartePrices('vendor-id');
  }
}
