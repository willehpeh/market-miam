import { DomainEvent } from '@market-monster/event-sourcing';

import { PlannedItem } from '../planned-item';

export type ItemsPlannedForMarketDay = DomainEvent<'ItemsPlannedForMarketDay', {
  items: PlannedItem[],
  marketId: string,
  date: string
}>
