import { Aggregate, UnhandledEventTypeError } from '@market-monster/event-sourcing';
import { LocalDate, LocalTime } from '@market-monster/common';
import { MarketId } from '@market-monster/shared-kernel';
import { ItemMarkedAsSoldOut, ItemsPlannedForMarketDay, MarketDayEvent } from './events';
import { PlannedItem } from './planned-item';
import { MarketDayInThePastError } from './errors';
import { ItemId } from '../repertoire/item';

export type MarketDaySnapshot = {
  marketId: string;
  date: string;
};

export class MarketDay extends Aggregate {

  constructor(private readonly _marketId: MarketId,
              private readonly _date: LocalDate,
              private readonly _today: LocalDate) {
    super();
  }

  apply(event: MarketDayEvent): void {
    switch (event.type) {
      case 'ItemsPlannedForMarketDay':
        // implement later
        break;
      case 'ItemMarkedAsSoldOut':
        // implement later
        break;
      default:
        throw new UnhandledEventTypeError(event, this.constructor.name);
    }
  }

  planItems(items: PlannedItem[]) {
    if (this._date.isBefore(this._today)) {
      throw new MarketDayInThePastError();
    }
    const event: ItemsPlannedForMarketDay = {
      type: 'ItemsPlannedForMarketDay',
      payload: {
        items: items.map(item => item.value()),
        marketId: this._marketId.value(),
        date: this._date.value()
      }
    };
    this.raise(event);
  }

  snapshot(): MarketDaySnapshot {
    return {
      marketId: this._marketId.value(),
      date: this._date.value()
    };
  }

  markItemAsSoldOut(itemId: ItemId, time: LocalTime) {
    const event: ItemMarkedAsSoldOut = {
      type: 'ItemMarkedAsSoldOut',
      payload: {
        itemId: itemId.value(),
        marketId: this._marketId.value(),
        date: this._date.value(),
        time: time.value()
      }
    };
    this.raise(event);
  }
}
