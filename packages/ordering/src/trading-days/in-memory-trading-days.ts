import { NoTradingDay, ScheduledTradingDay, Stand, TradingDay } from '../order';
import { TradingDays } from './trading-days';

export class InMemoryTradingDays extends TradingDays {
  private readonly stand: Stand = { menuDishIds: [], soldOutDishIds: [], closed: false, ended: false, prices: {} };
  private scheduled = true;
  private readonly variantPrices = new Map<string, Map<string, number>>();

  setMenu(...dishIds: string[]): void {
    this.stand.menuDishIds = dishIds;
  }

  markSoldOut(dishId: string): void {
    this.stand.soldOutDishIds.push(dishId);
  }

  close(): void {
    this.stand.closed = true;
  }

  end(): void {
    this.stand.ended = true;
  }

  setPrice(dishId: string, unitPrice: number): void {
    this.stand.prices[dishId] = unitPrice;
  }

  setVariantPrice(dishId: string, variant: string, unitPrice: number): void {
    this.variantPrices.set(dishId, (this.variantPrices.get(dishId) ?? new Map()).set(variant, unitPrice));
  }

  unschedule(): void {
    this.scheduled = false;
  }

  async forVendorAtMarketOn(): Promise<TradingDay> {
    if (!this.scheduled) {
      return new NoTradingDay();
    }
    return new ScheduledTradingDay({
      ...this.stand,
      menuDishIds: [...this.stand.menuDishIds],
      soldOutDishIds: [...this.stand.soldOutDishIds],
      prices: { ...this.stand.prices },
    });
  }
}
