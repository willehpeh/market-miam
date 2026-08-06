import { DomainEvent } from '@market-miam/event-sourcing';

export type MarketDayMenuSet = DomainEvent<'MarketDayMenuSet', {
  itemIds: string[],
  marketId: string,
  date: string
}>
