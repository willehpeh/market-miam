import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { MarketDays, MarketDayView } from './market-days';
import { environment } from '../../environments/environment';

type UpcomingResponse = {
  marketDays: (Omit<MarketDayView, 'itemIds'> & { items: { itemId: string }[] })[];
};

@Injectable()
export class HttpMarketDays implements MarketDays {
  private readonly http = inject(HttpClient);

  upcoming(): Observable<MarketDayView[]> {
    return this.http
      .get<UpcomingResponse>(`${environment.apiBaseUrl}/api/market-days/upcoming`)
      .pipe(map(({ marketDays }) => marketDays.map(({ items, ...day }) => ({ ...day, itemIds: items.map(d => d.itemId) }))));
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
}
