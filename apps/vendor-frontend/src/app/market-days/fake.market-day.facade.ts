import { Injectable, signal } from '@angular/core';
import { MarketDayFacade } from './market-day.facade';
import { ItemOutcome, MarketDaySlot, MarketDayView } from './market-days';
import { MarketDay } from './market-day';
import { UnratedMarketDay } from './unrated-market-day';

@Injectable()
export class FakeMarketDayFacade implements MarketDayFacade {
  readonly days = signal<MarketDay[]>([]);
  readonly loading = signal(false);
  readonly day = signal<MarketDaySlot<MarketDay>>({ status: 'loading' });
  readonly unrated = signal<UnratedMarketDay[]>([]);
  readonly unratedLoading = signal(false);
  loaded = false;
  loadedUnrated = 0;
  loadedDays: { marketId: string; date: string }[] = [];
  savedMenu: { marketId: string; date: string; itemIds: string[] } | undefined;
  availabilityChanges: { marketId: string; date: string; itemId: string; soldOut: boolean }[] = [];
  closures: { marketId: string; date: string; closed: boolean }[] = [];
  recordedBilan:
    | { marketId: string; date: string; outcomes: Record<string, ItemOutcome>; complete: boolean }
    | undefined;

  load(): void {
    this.loaded = true;
  }

  loadDay(marketId: string, date: string): void {
    this.loadedDays.push({ marketId, date });
  }

  loadUnrated(): void {
    this.loadedUnrated += 1;
  }

  // The screen it stands for renders the slot, so a fake that moved only the list would
  // let a broken patch pass — the optimistic marks land on both copies (decision 58).
  showing(view: MarketDayView): void {
    const day = new MarketDay(view);
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

  recordBilan(marketId: string, date: string, outcomes: Record<string, ItemOutcome>, complete: boolean): void {
    this.recordedBilan = { marketId, date, outcomes, complete };
  }

  // The optimistic patch is part of the port's contract — the row moves on the call, not
  // on the response — so the fake moves it too, through the day as the store does.
  private changeAvailability(marketId: string, date: string, itemId: string, soldOut: boolean): void {
    this.availabilityChanges.push({ marketId, date, itemId, soldOut });
    const marked = (day: MarketDay): MarketDay => (day.isOn(marketId, date) ? day.withAvailability(itemId, { soldOut }) : day);
    this.days.update(days => days.map(marked));
    this.day.update(slot => (slot.status === 'found' ? { status: 'found', day: marked(slot.day) } : slot));
  }
}

// Market days that have already loaded these days.
export function marketDaysOf(...views: MarketDayView[]): FakeMarketDayFacade {
  const marketDays = new FakeMarketDayFacade();
  marketDays.days.set(views.map((view) => new MarketDay(view)));
  return marketDays;
}
