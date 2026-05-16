import { DomainEvent } from '@market-monster/event-sourcing';
import { PlannedItem } from '../market-day';

export type ItemsPlannedForMarketDay = DomainEvent<'ItemsPlannedForMarketDay', {
  items: PlannedItem[],
  marketId: string,
  date: string
}>
