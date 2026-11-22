import { TradingDay } from '../order';
import { TradingDays } from './trading-days';

export class InMemoryTradingDays extends TradingDays {
  private readonly soldOut: string[] = [];

  markSoldOut(dishId: string): void {
    this.soldOut.push(dishId);
  }

  async forVendorAtMarketOn(): Promise<TradingDay> {
    return new TradingDay(this.soldOut);
  }
}
