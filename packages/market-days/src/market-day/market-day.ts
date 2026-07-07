import { Aggregate } from '@market-miam/event-sourcing';
import { LocalDate, LocalTime } from '@market-miam/common';
import { MarketId } from '@market-miam/shared-kernel';
import { ItemMarkedAsSoldOut, ItemsPlannedForMarketDay, ItemUnplannedFromMarketDay, MarketDayEvent } from './events';
import { PlannedItem } from './planned-item';
import { ItemAlreadySoldOutError, ItemNotPlannedError, MarketDayInThePastError } from './errors';
import { ItemId } from '../catalogue';

type MarketDaySnapshot = {
  marketId: string;
  date: string;
};

export class MarketDay extends Aggregate {

  private _items: ItemId[] = [];
  private _soldOut: ItemId[] = [];

  constructor(private readonly _marketId: MarketId,
              private readonly _date: LocalDate,
              private readonly _today: LocalDate) {
    super();
  }

  apply(event: MarketDayEvent): void {
    switch (event.type) {
      case 'ItemsPlannedForMarketDay':
        this._items.push(...event.payload.items.map(item => new ItemId(item.itemId)));
        break;
      case 'ItemMarkedAsSoldOut':
        this._soldOut.push(new ItemId(event.payload.itemId));
        break;
      case 'ItemUnplannedFromMarketDay':
        this._items = this._items.filter(itemId => !itemId.equals(new ItemId(event.payload.itemId)));
        break;
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
      },
      version: 1
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
    if (this.notPlanned(itemId)) {
      throw new ItemNotPlannedError();
    }
    if (this._soldOut.some(id => id.equals(itemId))) {
      throw new ItemAlreadySoldOutError();
    }
    const event: ItemMarkedAsSoldOut = {
      type: 'ItemMarkedAsSoldOut',
      payload: {
        itemId: itemId.value(),
        marketId: this._marketId.value(),
        date: this._date.value(),
        time: time.value()
      },
      version: 1
    };
    this.raise(event);
  }

  unplanItem(itemId: ItemId) {
    if (this._date.isBefore(this._today)) {
      throw new MarketDayInThePastError();
    }
    if (this.notPlanned(itemId)) {
      return;
    }
    const event: ItemUnplannedFromMarketDay = {
      type: 'ItemUnplannedFromMarketDay',
      payload: {
        itemId: itemId.value(),
        marketId: this._marketId.value(),
        date: this._date.value()
      },
      version: 1
    };
    this.raise(event);
  }

  private notPlanned(itemId: ItemId): boolean {
    return !this._items.some(id => id.equals(itemId));
  }
}
