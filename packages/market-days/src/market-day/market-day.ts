import { Aggregate } from '@market-monster/event-sourcing';
import { LocalDate } from '@market-monster/common';
import { MarketId } from '@market-monster/shared-kernel';
import { ItemsPlannedForMarketDay } from './events/items-planned-for-market-day';
import { MarketDayEvent } from './events/market-day.event';
import { PlannedItem } from './planned-item';

export type MarketDaySnapshot = {
  marketId: string;
  date: string;
};

export class MarketDay extends Aggregate {

  constructor(private readonly _marketId: MarketId,
              private readonly _date: LocalDate) {
    super();
  }

  apply(event: MarketDayEvent): void {
    switch (event.type) {
      case 'ItemsPlannedForMarketDay':
        // implement later
        break;
    }
  }

  planItems(items: PlannedItem[]) {
    const event: ItemsPlannedForMarketDay = {
      type: 'ItemsPlannedForMarketDay',
      payload: {
        items: items.map(item => ({ itemId: item.itemId(), quantity: item.quantity() })),
        marketId: this._marketId.value(),
        date: this._date.value()
      }
    }
    this.raise(event);
  }

  snapshot(): MarketDaySnapshot {
    return {
      marketId: this._marketId.value(),
      date: this._date.value()
    };
  }
}
