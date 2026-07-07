import { DomainEvent } from '@market-miam/event-sourcing';

export type ItemUnplannedFromMarketDay = DomainEvent<'ItemUnplannedFromMarketDay', {
  itemId: string,
  marketId: string,
  date: string
}>
