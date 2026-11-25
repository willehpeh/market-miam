import { TradingDay, TradingDayFacts, UnscheduledDay } from '../order';
import { TradingDays } from './trading-days';

export class InMemoryTradingDays extends TradingDays {
  private readonly facts: TradingDayFacts = { menuDishIds: [], soldOutDishIds: [], closed: false, ended: false };
  private scheduled = true;

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

  unschedule(): void {
    this.scheduled = false;
  }

  async forVendorAtMarketOn(): Promise<TradingDay | UnscheduledDay> {
    if (!this.scheduled) {
      return new UnscheduledDay();
    }
    return new TradingDay({
      ...this.facts,
      menuDishIds: [...this.facts.menuDishIds],
      soldOutDishIds: [...this.facts.soldOutDishIds],
    });
  }
}
