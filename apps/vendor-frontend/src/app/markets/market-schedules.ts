import { Observable } from 'rxjs';

export interface MarketScheduleView {
  scheduleId: string;
  market: {
    id: string;
    name: string;
    streetAddress?: string;
    codePostal: string;
    town: string;
    pitch?: string;
  };
  startDate: string;
  days: { day: string; startTime?: string; endTime?: string }[];
  frequency: { weeks: number };
}

export interface MarketSchedulesView {
  schedules: MarketScheduleView[];
}

export abstract class MarketSchedules {
  abstract list(): Observable<MarketSchedulesView>;
}
