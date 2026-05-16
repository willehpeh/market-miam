import { Aggregate } from '@market-monster/event-sourcing';
import { LocalDate } from '@market-monster/common';
import { MarketId } from '@market-monster/shared-kernel';
import { ItemsPlannedForMarketDay } from './events/items-planned-for-market-day';
import { MarketDayEvent } from './events/market-day.event';
import { PlannedItem } from './planned-item';

export class MarketDay extends Aggregate {
  apply(event: MarketDayEvent): void {
  }

  planItems(items: PlannedItem[], marketId: MarketId, date: LocalDate) {
    const event: ItemsPlannedForMarketDay = {
      type: 'ItemsPlannedForMarketDay',
      payload: { items, marketId: marketId.value(), date: date.value() }
    }
    this.raise(event);
  }
}
