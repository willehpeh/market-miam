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

export interface NewSchedule {
  market: {
    name: string;
    streetAddress?: string;
    codePostal: string;
    town: string;
    pitch?: string;
  };
  days: { day: string; startTime?: string; endTime?: string }[];
  frequency: { weeks: number };
}

export abstract class MarketSchedules {
  abstract list(): Observable<MarketSchedulesView>;
  abstract register(schedule: MarketScheduleView): Observable<void>;
}
