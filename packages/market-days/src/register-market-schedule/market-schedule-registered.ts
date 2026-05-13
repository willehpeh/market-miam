import { DomainEvent } from '@market-monster/event-sourcing';

export type MarketScheduleRegistered = DomainEvent<'MarketScheduleRegistered', {
  scheduleId: string;
  scheduleName: string;
  marketId: string;
  days: {
    day: string;
    startTime?: string;
    endTime?: string;
  }[];
  every: {
    weeks?: number;
  }
}>;
