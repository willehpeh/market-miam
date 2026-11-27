import { ItemId } from '../catalogue';
import { MarketDayEvent, Menu } from '../market-day';
import { SoldOutItems } from '../market-day/sold-out-items';
import { MarketDayPhase } from '../market-schedule-view/market-day-clock';
import { CatalogueViewItem } from '../catalogue-view/catalogue-view';
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
      case 'MarketDayReopened':
        this._closed = false;
        break;
    }
  }

  answer(phase: MarketDayPhase, pricedCatalogue: CatalogueViewItem[]): LiveMarketDay {
    return {
      dishes: pricedCatalogue
        .filter(item => this._menu.includes(new ItemId(item.itemId)))
        .map(item => ({
          itemId: item.itemId,
          name: item.name,
          price: item.price,
          variants: item.variants?.map(({ name, price }) => ({ name, price })),
          soldOut: this._soldOut.includes(new ItemId(item.itemId)),
        })),
      closed: this._closed,
      phase,
    };
  }
}
