import { computed, Injectable, Signal, signal } from '@angular/core';
import { MarketPricesFacade } from './market-prices.facade';
import { PriceList } from './market-prices';

@Injectable()
export class FakeMarketPricesFacade implements MarketPricesFacade {
  readonly byMarket = signal<Record<string, PriceList>>({});
  readonly loading = signal(false);
  loaded = false;
  saved: { marketId: string; prices: PriceList } | undefined;

  pricesFor(marketId: string): Signal<PriceList> {
    return computed(() => this.byMarket()[marketId] ?? {});
  }

  load(): void {
    this.loaded = true;
  }

  setPrices(marketId: string, prices: PriceList): void {
    this.saved = { marketId, prices };
  }
}
