import { ItemId } from '../catalogue';
import { MarketDayEvent, Menu } from '../market-day';
import { SoldOutItems } from '../market-day/sold-out-items';
import { MarketDayPhase } from '../market-schedule-view/market-day-clock';
import { LiveMarketDay } from './live-market-day';

type RecordedFacts = { menu: Menu; soldOut: SoldOutItems; closed: boolean };

export class MarketDayOnRecord {
  constructor(
    private readonly facts: RecordedFacts = { menu: new Menu([]), soldOut: new SoldOutItems(), closed: false },
  ) {}

  with(event: MarketDayEvent): MarketDayOnRecord {
    switch (event.type) {
      case 'MarketDayMenuSet':
        return this.changing({ menu: new Menu(event.payload.itemIds.map(itemId => new ItemId(itemId))) });
      case 'ItemMarkedAsSoldOut':
        return this.changing({ soldOut: this.facts.soldOut.with(new ItemId(event.payload.itemId)) });
      case 'ItemMarkedAsAvailable':
        return this.changing({ soldOut: this.facts.soldOut.without(new ItemId(event.payload.itemId)) });
      case 'MarketDayClosed':
        return this.changing({ closed: true });
      default:
        return this;
    }
  }

  answer(phase: MarketDayPhase): LiveMarketDay {
    const { menu, soldOut, closed } = this.facts;
    return { itemIds: menu.value(), soldOutItemIds: soldOut.value(), closed, phase };
  }

  private changing(change: Partial<RecordedFacts>): MarketDayOnRecord {
    return new MarketDayOnRecord({ ...this.facts, ...change });
  }
}
