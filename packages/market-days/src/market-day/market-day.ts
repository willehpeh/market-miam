import { Aggregate } from '@market-miam/event-sourcing';
import { LocalDate, LocalTime } from '@market-miam/common';
import { ItemMarkedAsSoldOut, MarketDayEvent, MarketDayMenuSet } from './events';
import { ItemAlreadySoldOutError, ItemNotPlannedError, MarketDayInThePastError } from './errors';
import { MarketDayId } from './market-day-id';
import { Menu } from './menu';
import { ItemId } from '../catalogue';

export class MarketDay extends Aggregate {

  private _menu = new Menu([]);
  private _soldOut: ItemId[] = [];

  constructor(private readonly _id: MarketDayId,
              private readonly _today: LocalDate) {
    super();
  }

  apply(event: MarketDayEvent): void {
    switch (event.type) {
      case 'MarketDayMenuSet':
        this._menu = new Menu(event.payload.itemIds.map(itemId => new ItemId(itemId)));
        this._soldOut = this._soldOut.filter(itemId => this._menu.includes(itemId));
        break;
      case 'ItemMarkedAsSoldOut':
        this._soldOut.push(new ItemId(event.payload.itemId));
        break;
    }
  }

  setMenu(menu: Menu) {
    if (this.inThePast()) {
      throw new MarketDayInThePastError();
    }
    if (menu.equals(this._menu)) {
      return;
    }
    const event: MarketDayMenuSet = {
      type: 'MarketDayMenuSet',
      payload: {
        itemIds: menu.value(),
        ...this._id.snapshot()
      },
      version: 1
    };
    this.raise(event);
  }

  markItemAsSoldOut(itemId: ItemId, time: LocalTime) {
    if (!this._menu.includes(itemId)) {
      throw new ItemNotPlannedError();
    }
    if (this._soldOut.some(id => id.equals(itemId))) {
      throw new ItemAlreadySoldOutError();
    }
    const event: ItemMarkedAsSoldOut = {
      type: 'ItemMarkedAsSoldOut',
      payload: {
        itemId: itemId.value(),
        ...this._id.snapshot(),
        time: time.value()
      },
      version: 1
    };
    this.raise(event);
  }

  private inThePast(): boolean {
    return this._id.isBefore(this._today);
  }
}
