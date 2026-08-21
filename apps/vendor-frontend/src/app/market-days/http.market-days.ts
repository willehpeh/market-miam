import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ItemOutcome, MarketDays, MarketDayView, UnratedMarketDay } from './market-days';
import { environment } from '../../environments/environment';

type SentDay = Omit<MarketDayView, 'itemIds'> & { items: { itemId: string }[] };

type UpcomingResponse = { marketDays: SentDay[] };

// The API joins the catalogue onto the menu; nothing here renders that join.
const withItemIds = ({ items, ...day }: SentDay): MarketDayView => ({ ...day, itemIds: items.map(item => item.itemId) });

@Injectable()
export class HttpMarketDays implements MarketDays {
  private readonly http = inject(HttpClient);

  upcoming(): Observable<MarketDayView[]> {
    return this.http
      .get<UpcomingResponse>(`${environment.apiBaseUrl}/api/market-days/upcoming`)
      .pipe(map(({ marketDays }) => marketDays.map(withItemIds)));
  }

  // The one backward-looking read, and its own route: the upcoming list looks forward and
  // drops a day at endTime (decision 65).
  unrated(): Observable<UnratedMarketDay[]> {
    return this.http
      .get<{ marketDays: UnratedMarketDay[] }>(`${environment.apiBaseUrl}/api/market-days/unrated`)
      .pipe(map(({ marketDays }) => marketDays));
  }

  day(marketId: string, date: string): Observable<MarketDayView> {
    return this.http
      .get<SentDay>(`${environment.apiBaseUrl}/api/market-days/${marketId}/${date}`)
      .pipe(map(withItemIds));
  }

  setMenu(marketId: string, date: string, itemIds: string[]): Observable<void> {
    return this.http.put<void>(`${environment.apiBaseUrl}/api/market-days/${marketId}/${date}/menu`, { itemIds });
  }

  changeAvailability(marketId: string, date: string, itemId: string, soldOut: boolean): Observable<void> {
    return this.http.put<void>(
      `${environment.apiBaseUrl}/api/market-days/${marketId}/${date}/items/${itemId}/availability`,
      { soldOut },
    );
  }

  changeClosure(marketId: string, date: string, closed: boolean): Observable<void> {
    return this.http.put<void>(`${environment.apiBaseUrl}/api/market-days/${marketId}/${date}/closed`, { closed });
  }

  // The whole set in one body, setMenu's shape rather than the availability pair's
  // (decisions 72, 73): a bilan is bookkeeping in one sitting, not a stream of taps.
  recordBilan(marketId: string, date: string, outcomes: Record<string, ItemOutcome>): Observable<void> {
    return this.http.put<void>(`${environment.apiBaseUrl}/api/market-days/${marketId}/${date}/bilan`, { outcomes });
  }
}
