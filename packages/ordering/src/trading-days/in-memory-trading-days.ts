import { DishOnSale, FlatPricing, NoTradingDay, ScheduledTradingDay, SoldOutDish, Stand, TradingDay, VariantPricing } from '../order';
import { TradingDays } from './trading-days';

export class InMemoryTradingDays implements TradingDays {
  private readonly stand: Stand = { menu: new Map(), closed: false, opened: true, ended: false };
  private scheduled = true;

  offer(dishId: string, unitPrice: number): void {
    this.stand.menu.set(dishId, new DishOnSale(new FlatPricing(unitPrice)));
  }

  offerVariants(dishId: string, unitPrices: Record<string, number>): void {
    this.stand.menu.set(dishId, new DishOnSale(new VariantPricing(unitPrices)));
  }

  takeOffMenu(dishId: string): void {
    this.stand.menu.delete(dishId);
  }

  markSoldOut(dishId: string): void {
    this.stand.menu.set(dishId, new SoldOutDish());
  }

  close(): void {
    this.stand.closed = true;
  }

  end(): void {
    this.stand.ended = true;
  }

  beforeOpening(): void {
    this.stand.opened = false;
  }

  unschedule(): void {
    this.scheduled = false;
  }

  async forVendorAtMarketOn(): Promise<TradingDay> {
    if (!this.scheduled) {
      return new NoTradingDay();
    }
    return new ScheduledTradingDay({ ...this.stand, menu: new Map(this.stand.menu) });
  }
}
