import { TradingDay } from '../order';
import { TradingDays } from './trading-days';

export class InMemoryTradingDays extends TradingDays {
  private readonly soldOut: string[] = [];
  private closed = false;

  markSoldOut(dishId: string): void {
    this.soldOut.push(dishId);
  }

  close(): void {
    this.closed = true;
  }

  async forVendorAtMarketOn(): Promise<TradingDay> {
    return new TradingDay(this.soldOut);
  }
}
