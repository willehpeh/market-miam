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
  itemIds: string[];
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
}
