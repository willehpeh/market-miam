import { Injectable, signal } from '@angular/core';
import { MarketPricesFacade } from './market-prices.facade';
import { MarketPricesView } from './market-prices';

@Injectable()
export class FakeMarketPricesFacade implements MarketPricesFacade {
  readonly markets = signal<MarketPricesView[]>([]);
  loaded = false;

  load(): void {
    this.loaded = true;
  }
}
