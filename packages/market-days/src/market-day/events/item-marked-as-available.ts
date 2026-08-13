import { DomainEvent } from '@market-miam/event-sourcing';

export type ItemMarkedAsAvailable = DomainEvent<'ItemMarkedAsAvailable', {
  itemId: string,
  marketId: string,
  date: string,
  time: string
}>
