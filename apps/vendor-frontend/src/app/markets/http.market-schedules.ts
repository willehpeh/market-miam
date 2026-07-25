import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MarketScheduleView, MarketSchedules, MarketSchedulesView } from './market-schedules';
import { environment } from '../../environments/environment';

type MarketScheduleRequest = {
  scheduleId: string;
  startDate: string;
  market: {
    id: string;
    name: string;
    streetAddress?: string;
    codePostal: string;
    town: string;
    pitch?: string;
  };
  days: { day: string; startTime?: string; endTime?: string }[];
  frequency: { weeks: number };
};

@Injectable()
export class HttpMarketSchedules implements MarketSchedules {
  private readonly http = inject(HttpClient);

  list(): Observable<MarketSchedulesView> {
    return this.http.get<MarketSchedulesView>(`${environment.apiBaseUrl}/api/market-schedules`);
  }

  register(schedule: MarketScheduleView): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/api/market-schedules`, requestFrom(schedule));
  }

  amend(scheduleId: string, schedule: MarketScheduleView): Observable<void> {
    return this.http.put<void>(`${environment.apiBaseUrl}/api/market-schedules/${scheduleId}`, requestFrom(schedule));
  }
}

function requestFrom(schedule: MarketScheduleView): MarketScheduleRequest {
  const { marketId, market, ...rest } = schedule;
  return { ...rest, market: { id: marketId, ...market } };
}
