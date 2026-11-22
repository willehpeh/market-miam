import { Signal } from '@angular/core';
import { ItemOutcome, MarketDaySlot, UnratedMarketDay } from './market-days';
import { MarketDay } from './market-day';

export abstract class MarketDayFacade {
  abstract readonly days: Signal<MarketDay[]>;
  abstract readonly loading: Signal<boolean>;
  abstract readonly day: Signal<MarketDaySlot<MarketDay>>;
  abstract readonly unrated: Signal<UnratedMarketDay[]>;
  abstract readonly unratedLoading: Signal<boolean>;

  abstract load(): void;
  abstract loadDay(marketId: string, date: string): void;
  abstract loadUnrated(): void;
  abstract setMenu(marketId: string, date: string, itemIds: string[]): void;
  abstract markSoldOut(marketId: string, date: string, itemId: string): void;
  abstract markAvailable(marketId: string, date: string, itemId: string): void;
  abstract close(marketId: string, date: string): void;
  abstract reopen(marketId: string, date: string): void;
  abstract recordBilan(
    marketId: string,
    date: string,
    outcomes: Record<string, ItemOutcome>,
    complete: boolean,
  ): void;
}
