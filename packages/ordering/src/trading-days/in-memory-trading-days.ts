import { TradingDay } from '../order';
import { TradingDays } from './trading-days';

export class InMemoryTradingDays extends TradingDays {
  private readonly soldOut: string[] = [];
  private closed = false;
  private ended = false;

  markSoldOut(dishId: string): void {
    this.soldOut.push(dishId);
  }

  close(): void {
    this.closed = true;
  }

  end(): void {
    this.ended = true;
  }

  async forVendorAtMarketOn(): Promise<TradingDay> {
    return new TradingDay({ soldOutDishIds: this.soldOut, closed: this.closed, ended: this.ended });
  }
}
