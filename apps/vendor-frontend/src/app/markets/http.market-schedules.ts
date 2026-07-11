import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MarketScheduleView, MarketSchedules, MarketSchedulesView } from './market-schedules';
import { environment } from '../../environments/environment';

@Injectable()
export class HttpMarketSchedules implements MarketSchedules {
  private readonly http = inject(HttpClient);

  list(): Observable<MarketSchedulesView> {
    return this.http.get<MarketSchedulesView>(`${environment.apiBaseUrl}/api/market-schedules`);
  }

  register(schedule: MarketScheduleView): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/api/market-schedules`, schedule);
  }
}
