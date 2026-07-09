import { DomainEvent } from 'packages/event-sourcing/src';

export type MarketScheduleRegistered = DomainEvent<'MarketScheduleRegistered', {
  market: {
    id: string;
    name: string;
    streetAddress?: string;
    codePostal: string;
    town: string;
    pitch?: string;
  };
  scheduleId: string;
  scheduleName: string;
  startDate: string;
  days: {
    day: string;
    startTime?: string;
    endTime?: string;
  }[];
  frequency: {
    weeks: number;
  }
}>;
