import { Signal } from '@angular/core';
import { MarketDayView } from './market-days';

export abstract class MarketDayFacade {
  abstract readonly days: Signal<MarketDayView[]>;
  abstract readonly loading: Signal<boolean>;

  abstract load(): void;
  abstract setMenu(marketId: string, date: string, itemIds: string[]): void;
  abstract markSoldOut(marketId: string, date: string, itemId: string): void;
  abstract markAvailable(marketId: string, date: string, itemId: string): void;
}
