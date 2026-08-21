import { Injectable, signal } from '@angular/core';
import { MarketPricesFacade } from './market-prices.facade';
import { MarketPricesView, PriceList } from './market-prices';

@Injectable()
export class FakeMarketPricesFacade implements MarketPricesFacade {
  readonly markets = signal<MarketPricesView[]>([]);
  readonly loading = signal(false);
  loaded = false;
  saved: { marketId: string; prices: PriceList } | undefined;

  load(): void {
    this.loaded = true;
  }

  setPrices(marketId: string, prices: PriceList): void {
    this.saved = { marketId, prices };
  }
}
