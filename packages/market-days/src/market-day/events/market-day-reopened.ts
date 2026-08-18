import { DomainEvent } from '@market-miam/event-sourcing';

export type MarketDayReopened = DomainEvent<'MarketDayReopened', {
  marketId: string,
  date: string,
  time: string
}>
