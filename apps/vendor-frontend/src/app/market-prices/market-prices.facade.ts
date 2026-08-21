import { Signal } from '@angular/core';
import { MarketPricesView } from './market-prices';

export abstract class MarketPricesFacade {
  abstract readonly markets: Signal<MarketPricesView[]>;

  abstract load(): void;
}
