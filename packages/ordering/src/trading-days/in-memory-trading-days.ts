import { VendorId } from '@market-miam/shared-kernel';
import { HeldOrder, RefusalReason } from '../order';
import { TradingDays } from './trading-days';

export class InMemoryTradingDays extends TradingDays {
  private readonly soldOut = new Set<string>();

  markSoldOut(dishId: string): void {
    this.soldOut.add(dishId);
  }

  async refusalOf(vendorId: VendorId, order: HeldOrder): Promise<RefusalReason | undefined> {
    return order.lines.some(line => this.soldOut.has(line.dishId)) ? 'sold-out' : undefined;
  }
}
