import { Aggregate } from '@market-miam/event-sourcing';
import { LocalDate, LocalTime } from '@market-miam/common';
import { ItemMarkedAsAvailable, ItemMarkedAsSoldOut, MarketDayEvent, MarketDayMenuSet } from './events';
import { ItemAlreadyAvailableError, ItemAlreadySoldOutError, ItemNotPlannedError, MarketDayInThePastError, MarketDayNotTodayError } from './errors';
import { MarketDayId } from './market-day-id';
import { Menu } from './menu';
import { SoldOutItems } from './sold-out-items';
import { ItemId } from '../catalogue';

export class MarketDay extends Aggregate {

  private _menu = new Menu([]);
  private _soldOut = new SoldOutItems();

  constructor(private readonly _id: MarketDayId,
              private readonly _today: LocalDate) {
    super();
  }

  apply(event: MarketDayEvent): void {
    switch (event.type) {
      case 'MarketDayMenuSet':
        this._menu = new Menu(event.payload.itemIds.map(itemId => new ItemId(itemId)));
        this._soldOut = this._soldOut.keptBy(this._menu);
        break;
      case 'ItemMarkedAsSoldOut':
        this._soldOut = this._soldOut.with(new ItemId(event.payload.itemId));
        break;
      case 'ItemMarkedAsAvailable':
        this._soldOut = this._soldOut.without(new ItemId(event.payload.itemId));
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

  // Stricter than setMenu's past-only guard: planning ahead is legal, availability is a
  // claim about right now (LIVE-MODE-PLAN.md decision 16).
  markItemAsSoldOut(itemId: ItemId, time: LocalTime) {
    if (this.notToday()) {
      throw new MarketDayNotTodayError();
    }
    if (!this._menu.includes(itemId)) {
      throw new ItemNotPlannedError();
    }
    if (this._soldOut.includes(itemId)) {
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

  markItemAsAvailable(itemId: ItemId, time: LocalTime) {
    if (this.notToday()) {
      throw new MarketDayNotTodayError();
    }
    if (!this._menu.includes(itemId)) {
      throw new ItemNotPlannedError();
    }
    if (!this._soldOut.includes(itemId)) {
      throw new ItemAlreadyAvailableError();
    }
    const event: ItemMarkedAsAvailable = {
      type: 'ItemMarkedAsAvailable',
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

  private notToday(): boolean {
    return !this._id.isOn(this._today);
  }
}
