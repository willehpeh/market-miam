import { Availability } from './availability';
import { BasketLine } from './basket-line';
import { BasketRefusedError } from './basket-refused.error';
import { DishPricing } from './dish-pricing';
import { OrderLine } from './held-order';
import { TradingDay } from './trading-day';

export type Stand = {
  menuDishIds: string[];
  soldOutDishIds: string[];
  closed: boolean;
  opened: boolean;
  ended: boolean;
  pricing: Record<string, DishPricing>;
};

export class ScheduledTradingDay implements TradingDay {
  constructor(private readonly stand: Stand) {}

  availabilityOf(lines: BasketLine[]): Availability {
    if (this.stand.closed) {
      return 'closed';
    }
    if (!this.stand.opened) {
      return 'not-yet-open';
    }
    if (this.stand.ended) {
      return 'ended';
    }
    return lines.every(line => this.offers(line)) ? 'available' : 'sold-out';
  }

  quote(basket: BasketLine[]): OrderLine[] {
    const availability = this.availabilityOf(basket);
    if (availability !== 'available') {
      throw new BasketRefusedError(availability);
    }
    return basket.map(line => ({ ...line, unitPrice: this.stand.pricing[line.dishId].unitPriceFor(line) }));
  }

  private offers({ dishId }: BasketLine): boolean {
    return this.stand.menuDishIds.includes(dishId) && !this.stand.soldOutDishIds.includes(dishId);
  }
}
