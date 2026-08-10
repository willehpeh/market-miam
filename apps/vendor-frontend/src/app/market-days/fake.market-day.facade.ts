import { Injectable, signal } from '@angular/core';
import { MarketDayFacade } from './market-day.facade';
import { MarketDayView } from './market-days';

@Injectable()
export class FakeMarketDayFacade implements MarketDayFacade {
  readonly days = signal<MarketDayView[]>([]);
  readonly loading = signal(false);
  loaded = false;
  savedMenu: { marketId: string; date: string; itemIds: string[] } | undefined;

  load(): void {
    this.loaded = true;
  }

  setMenu(marketId: string, date: string, itemIds: string[]): void {
    this.savedMenu = { marketId, date, itemIds };
  }
}
