import { Observable } from 'rxjs';

// The day's menu is held as ids, not as the items the API joins on to it: the card counts
// them and the editor ticks them, and both read names and prices from the catalogue store.
export interface MarketDayView {
  scheduleId: string;
  marketId: string;
  date: string;
  day: string;
  startTime?: string;
  endTime?: string;
  absent: boolean;
  // Server-said calendar truth (decision 42): true from midnight, so the dashboard card
  // can open the live screen before the market's hours — never derived from the device clock.
  today: boolean;
  itemIds: string[];
  // Which of the day's items sold out during service — may name an id the catalogue has
  // since retired, which readers ignore, mirroring the API's own contract.
  soldOutItemIds: string[];
  market: {
    name: string;
    town: string;
    codePostal: string;
    streetAddress?: string;
    pitch?: string;
  };
}

export abstract class MarketDays {
  abstract upcoming(): Observable<MarketDayView[]>;
  abstract setMenu(marketId: string, date: string, itemIds: string[]): Observable<void>;
  abstract changeAvailability(marketId: string, date: string, itemId: string, soldOut: boolean): Observable<void>;
}
