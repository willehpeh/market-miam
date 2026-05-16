import { Aggregate } from '@market-monster/event-sourcing';
import { ItemsPlannedForMarketDay } from './events/items-planned-for-market-day';
import { MarketDayEvent } from './events/market-day.event';
import { PlannedItem } from './planned-item';

export class MarketDay extends Aggregate {
  apply(event: MarketDayEvent): void {
  }

  planItems(items: PlannedItem[], marketId: string, date: string) {
    const event: ItemsPlannedForMarketDay = {
      type: 'ItemsPlannedForMarketDay',
      payload: { items, marketId, date }
    }
    this.raise(event);
  }
}
