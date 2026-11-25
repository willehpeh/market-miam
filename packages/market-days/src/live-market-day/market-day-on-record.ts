import { ItemId } from '../catalogue';
import { MarketDayEvent, Menu } from '../market-day';
import { SoldOutItems } from '../market-day/sold-out-items';
import { LiveMarketDay } from './live-market-day';

export class MarketDayOnRecord {
  constructor(
    private readonly menu = new Menu([]),
    private readonly soldOut = new SoldOutItems(),
  ) {}

  with(event: MarketDayEvent): MarketDayOnRecord {
    switch (event.type) {
      case 'MarketDayMenuSet':
        return new MarketDayOnRecord(new Menu(event.payload.itemIds.map(itemId => new ItemId(itemId))), this.soldOut);
      case 'ItemMarkedAsSoldOut':
        return new MarketDayOnRecord(this.menu, this.soldOut.with(new ItemId(event.payload.itemId)));
      default:
        return this;
    }
  }

  answer(): LiveMarketDay {
    return { itemIds: this.menu.value(), soldOutItemIds: this.soldOut.value() };
  }
}
