import { Signal } from '@angular/core';
import { MarketDaySlot, MarketDayView } from './market-days';

export abstract class MarketDayFacade {
  abstract readonly days: Signal<MarketDayView[]>;
  abstract readonly loading: Signal<boolean>;
  abstract readonly day: Signal<MarketDaySlot>;

  abstract load(): void;
  abstract loadDay(marketId: string, date: string): void;
  abstract setMenu(marketId: string, date: string, itemIds: string[]): void;
  abstract markSoldOut(marketId: string, date: string, itemId: string): void;
  abstract markAvailable(marketId: string, date: string, itemId: string): void;
  abstract close(marketId: string, date: string): void;
  abstract reopen(marketId: string, date: string): void;
}
