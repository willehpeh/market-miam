import { Signal } from '@angular/core';
import { PriceList } from './market-prices';

export abstract class MarketPricesFacade {
  abstract readonly loading: Signal<boolean>;

  abstract pricesFor(marketId: string): Signal<PriceList>;
  abstract load(): void;
  abstract setPrices(marketId: string, prices: PriceList): void;
}
