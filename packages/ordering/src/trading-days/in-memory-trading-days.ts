import { TradingDay, TradingDayFacts } from '../order';
import { TradingDays } from './trading-days';

export class InMemoryTradingDays extends TradingDays {
  private readonly facts: TradingDayFacts = { menuDishIds: [], soldOutDishIds: [], closed: false, ended: false };

  setMenu(...dishIds: string[]): void {
    this.facts.menuDishIds = dishIds;
  }

  markSoldOut(dishId: string): void {
    this.facts.soldOutDishIds.push(dishId);
  }

  close(): void {
    this.facts.closed = true;
  }

  end(): void {
    this.facts.ended = true;
  }

  async forVendorAtMarketOn(): Promise<TradingDay> {
    return new TradingDay({
      ...this.facts,
      menuDishIds: [...this.facts.menuDishIds],
      soldOutDishIds: [...this.facts.soldOutDishIds],
    });
  }
}
