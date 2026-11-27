import { Availability } from './availability';
import { BasketLine } from './basket-line';
import { DishPricing } from './dish-pricing';
import { OrderLine } from './held-order';
import { TradingDay } from './trading-day';

export type Stand = {
  menuDishIds: string[];
  soldOutDishIds: string[];
  closed: boolean;
  ended: boolean;
  pricing: Record<string, DishPricing>;
};

export class ScheduledTradingDay implements TradingDay {
  constructor(private readonly stand: Stand) {}

  availabilityOf(lines: OrderLine[]): Availability {
    if (this.stand.closed) {
      return 'closed';
    }
    if (this.stand.ended) {
      return 'ended';
    }
    return lines.every(line => this.offers(line)) ? 'available' : 'sold-out';
  }

  price(basket: BasketLine[]): OrderLine[] {
    return basket.map(line => ({ ...line, unitPrice: this.stand.pricing[line.dishId].unitPriceFor(line) }));
  }

  private offers({ dishId }: OrderLine): boolean {
    return this.stand.menuDishIds.includes(dishId) && !this.stand.soldOutDishIds.includes(dishId);
  }
}
