import { NoTradingDay, FlatPricing, VariantPricing, ScheduledTradingDay, Stand, TradingDay } from '../order';
import { TradingDays } from './trading-days';

export class InMemoryTradingDays extends TradingDays {
  private readonly stand: Stand = { menuDishIds: [], soldOutDishIds: [], closed: false, ended: false, pricing: {} };
  private readonly variantPrices: Record<string, Record<string, number>> = {};
  private scheduled = true;
  private opened = true;

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
    this.stand.pricing[dishId] = new FlatPricing(unitPrice);
  }

  setVariantPrice(dishId: string, variant: string, unitPrice: number): void {
    this.variantPrices[dishId] = { ...this.variantPrices[dishId], [variant]: unitPrice };
    this.stand.pricing[dishId] = new VariantPricing(this.variantPrices[dishId]);
  }

  beforeOpening(): void {
    this.opened = false;
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
      pricing: { ...this.stand.pricing },
    });
  }
}
