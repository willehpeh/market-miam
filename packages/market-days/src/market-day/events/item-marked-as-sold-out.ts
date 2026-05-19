import { DomainEvent } from '@market-monster/event-sourcing';

export type ItemMarkedAsSoldOut = DomainEvent<'ItemMarkedAsSoldOut', {
  itemId: string,
  marketId: string,
  date: string,
  time: string
}>
