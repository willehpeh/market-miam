import { ItemId } from '../catalogue';
import { MarketDayEvent, Menu } from '../market-day';
import { SoldOutItems } from '../market-day/sold-out-items';
import { MarketDayPhase } from '../market-schedule-view/market-day-clock';
import { LiveMarketDay } from './live-market-day';

export class MarketDayOnRecord {
  constructor(
    private readonly menu = new Menu([]),
    private readonly soldOut = new SoldOutItems(),
    private readonly closed = false,
  ) {}

  with(event: MarketDayEvent): MarketDayOnRecord {
    switch (event.type) {
      case 'MarketDayMenuSet':
        return new MarketDayOnRecord(new Menu(event.payload.itemIds.map(itemId => new ItemId(itemId))), this.soldOut, this.closed);
      case 'ItemMarkedAsSoldOut':
        return new MarketDayOnRecord(this.menu, this.soldOut.with(new ItemId(event.payload.itemId)), this.closed);
      case 'ItemMarkedAsAvailable':
        return new MarketDayOnRecord(this.menu, this.soldOut.without(new ItemId(event.payload.itemId)), this.closed);
      case 'MarketDayClosed':
        return new MarketDayOnRecord(this.menu, this.soldOut, true);
      default:
        return this;
    }
  }

  answer(phase: MarketDayPhase): LiveMarketDay {
    return { itemIds: this.menu.value(), soldOutItemIds: this.soldOut.value(), closed: this.closed, phase };
  }
}
