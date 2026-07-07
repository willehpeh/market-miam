import { DomainEvent } from '@market-miam/event-sourcing';

export type ItemMarkedAsSoldOut = DomainEvent<'ItemMarkedAsSoldOut', {
  itemId: string,
  marketId: string,
  date: string,
  time: string
}>
