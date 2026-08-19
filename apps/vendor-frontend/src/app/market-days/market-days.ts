import { Observable } from 'rxjs';

export type MarketDayPhase = 'future' | 'due' | 'trading' | 'over' | 'past';

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
  // Where now sits against this day, said by the server (decision 56): `due`, `trading` and
  // `over` are today, either side of the market's hours; `future` and `past` are the dates
  // around it. Never derived from the device clock (decision 21), and nothing the vendor does
  // moves it — `closed` below is the fact they set. Read through live-status.ts, not directly.
  phase: MarketDayPhase;
  // The vendor shut the stand — not schedule truth, so a closed day is still *en cours*
  // by the clock (decision 13). The customer's list drops it; this screen keeps it to reopen.
  closed: boolean;
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
  abstract changeClosure(marketId: string, date: string, closed: boolean): Observable<void>;
}
