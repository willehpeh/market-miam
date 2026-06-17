import { DomainEvent } from '@market-monster/event-sourcing';

export type ItemUnplannedFromMarketDay = DomainEvent<'ItemUnplannedFromMarketDay', {
  itemId: string,
  marketId: string,
  date: string
}>
