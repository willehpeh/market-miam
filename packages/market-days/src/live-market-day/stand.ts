import { ItemId } from '../catalogue';
import { MarketDayEvent, Menu } from '../market-day';
import { SoldOutItems } from '../market-day/sold-out-items';
import { MarketDayPhase } from '../market-schedule-view/market-day-clock';
import { LiveMarketDay } from './live-market-day';

export class Stand {
  private _menu = new Menu([]);
  private _soldOut = new SoldOutItems();
  private _closed = false;

  apply(event: MarketDayEvent): void {
    switch (event.type) {
      case 'MarketDayMenuSet':
        this._menu = new Menu(event.payload.itemIds.map(itemId => new ItemId(itemId)));
        break;
      case 'ItemMarkedAsSoldOut':
        this._soldOut = this._soldOut.with(new ItemId(event.payload.itemId));
        break;
      case 'ItemMarkedAsAvailable':
        this._soldOut = this._soldOut.without(new ItemId(event.payload.itemId));
        break;
      case 'MarketDayClosed':
        this._closed = true;
        break;
    }
  }

  answer(phase: MarketDayPhase): LiveMarketDay {
    return { itemIds: this._menu.value(), soldOutItemIds: this._soldOut.value(), closed: this._closed, phase };
  }
}
