import { DomainEvent } from 'packages/event-sourcing/src';

export type MarketScheduleRegistered = DomainEvent<'MarketScheduleRegistered', {
  scheduleId: string;
  scheduleName: string;
  startDate: string;
  marketId: string;
  days: {
    day: string;
    startTime?: string;
    endTime?: string;
  }[];
  every: {
    weeks: number;
  }
}>;
