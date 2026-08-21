import { Signal } from '@angular/core';
import { MarketPricesView, PriceList } from './market-prices';

export abstract class MarketPricesFacade {
  abstract readonly markets: Signal<MarketPricesView[]>;
  abstract readonly loading: Signal<boolean>;

  abstract load(): void;
  abstract setPrices(marketId: string, prices: PriceList): void;
}
