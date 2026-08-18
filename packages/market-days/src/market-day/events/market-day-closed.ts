import { DomainEvent } from '@market-miam/event-sourcing';

export type MarketDayClosed = DomainEvent<'MarketDayClosed', {
  marketId: string,
  date: string,
  time: string
}>
