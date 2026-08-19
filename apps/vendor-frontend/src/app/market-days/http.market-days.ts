import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { MarketDays, MarketDayView } from './market-days';
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
}
