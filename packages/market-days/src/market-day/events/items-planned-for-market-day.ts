import { DomainEvent } from '@market-miam/event-sourcing';

export type ItemsPlannedForMarketDay = DomainEvent<'ItemsPlannedForMarketDay', {
  items: { itemId: string, name: string, quantity?: number }[],
  marketId: string,
  date: string
}>
