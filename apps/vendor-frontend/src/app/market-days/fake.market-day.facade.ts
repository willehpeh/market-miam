import { Injectable, signal } from '@angular/core';
import { MarketDayFacade } from './market-day.facade';
import { MarketDayView } from './market-days';

@Injectable()
export class FakeMarketDayFacade implements MarketDayFacade {
  readonly days = signal<MarketDayView[]>([]);
  readonly loading = signal(false);
  loaded = false;
  savedMenu: { marketId: string; date: string; itemIds: string[] } | undefined;
  availabilityChanges: { marketId: string; date: string; itemId: string; soldOut: boolean }[] = [];

  load(): void {
    this.loaded = true;
  }

  setMenu(marketId: string, date: string, itemIds: string[]): void {
    this.savedMenu = { marketId, date, itemIds };
  }

  markSoldOut(marketId: string, date: string, itemId: string): void {
    this.changeAvailability(marketId, date, itemId, true);
  }

  markAvailable(marketId: string, date: string, itemId: string): void {
    this.changeAvailability(marketId, date, itemId, false);
  }

  // The optimistic patch is part of the port's contract — the row moves on the call, not
  // on the response — so the fake moves it too.
  private changeAvailability(marketId: string, date: string, itemId: string, soldOut: boolean): void {
    this.availabilityChanges.push({ marketId, date, itemId, soldOut });
    this.days.update(days => days.map(day => {
      if (day.marketId !== marketId || day.date !== date) {
        return day;
      }
      const others = day.soldOutItemIds.filter(id => id !== itemId);
      return { ...day, soldOutItemIds: soldOut ? [...others, itemId] : others };
    }));
  }
}
