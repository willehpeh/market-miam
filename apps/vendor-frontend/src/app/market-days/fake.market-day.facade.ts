import { Injectable, signal } from '@angular/core';
import { MarketDayFacade } from './market-day.facade';
import { ItemOutcome, MarketDaySlot, MarketDayView, UnratedMarketDay } from './market-days';

@Injectable()
export class FakeMarketDayFacade implements MarketDayFacade {
  readonly days = signal<MarketDayView[]>([]);
  readonly loading = signal(false);
  readonly day = signal<MarketDaySlot>({ status: 'loading' });
  readonly unrated = signal<UnratedMarketDay[]>([]);
  readonly unratedLoading = signal(false);
  loaded = false;
  loadedUnrated = false;
  loadedDays: { marketId: string; date: string }[] = [];
  savedMenu: { marketId: string; date: string; itemIds: string[] } | undefined;
  availabilityChanges: { marketId: string; date: string; itemId: string; soldOut: boolean }[] = [];
  closures: { marketId: string; date: string; closed: boolean }[] = [];
  recordedBilan: { marketId: string; date: string; outcomes: Record<string, ItemOutcome> } | undefined;

  load(): void {
    this.loaded = true;
  }

  loadDay(marketId: string, date: string): void {
    this.loadedDays.push({ marketId, date });
  }

  loadUnrated(): void {
    this.loadedUnrated = true;
  }

  // The screen it stands for renders the slot, so a fake that moved only the list would
  // let a broken patch pass — the optimistic marks land on both copies (decision 58).
  showing(day: MarketDayView): void {
    this.day.set({ status: 'found', day });
    this.days.set([day]);
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

  close(marketId: string, date: string): void {
    this.closures.push({ marketId, date, closed: true });
  }

  reopen(marketId: string, date: string): void {
    this.closures.push({ marketId, date, closed: false });
  }

  recordBilan(marketId: string, date: string, outcomes: Record<string, ItemOutcome>): void {
    this.recordedBilan = { marketId, date, outcomes };
  }

  // The optimistic patch is part of the port's contract — the row moves on the call, not
  // on the response — so the fake moves it too.
  private changeAvailability(marketId: string, date: string, itemId: string, soldOut: boolean): void {
    this.availabilityChanges.push({ marketId, date, itemId, soldOut });
    const patch = (day: MarketDayView): MarketDayView => {
      if (day.marketId !== marketId || day.date !== date) {
        return day;
      }
      const others = day.soldOutItemIds.filter(id => id !== itemId);
      return { ...day, soldOutItemIds: soldOut ? [...others, itemId] : others };
    };
    this.days.update(days => days.map(patch));
    this.day.update(slot => (slot.status === 'found' ? { status: 'found', day: patch(slot.day) } : slot));
  }
}
