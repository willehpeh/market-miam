import { DomainEvent } from '@market-monster/event-sourcing';

export type MarketScheduleRegistered = DomainEvent<'MarketScheduleRegistered', {
  scheduleName: string;
  marketId: string;
  directionsToStall?: string;
  days: {
    day: string;
    startTime?: string;
    endTime?: string;
  }[];
  every: {
    weeks?: number;
  }
}>;
