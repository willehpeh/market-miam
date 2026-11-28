import { Availability } from './availability';
import { BasketLine } from './basket-line';
import { BasketRefusedError } from './basket-refused.error';
import { DishPricing } from './dish-pricing';
import { Quote } from './quote';
import { TradingDay } from './trading-day';

export type Stand = {
  menu: Map<string, DishPricing>;
  soldOutDishIds: string[];
  closed: boolean;
  opened: boolean;
  ended: boolean;
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

  quote(basket: BasketLine[]): Quote {
    const availability = this.availabilityOf(basket);
    if (availability !== 'available') {
      throw new BasketRefusedError(availability);
    }
    return new Quote(basket.map(line => ({ ...line, unitPrice: this.pricingOf(line).unitPriceFor(line) })));
  }

  private offers({ dishId }: BasketLine): boolean {
    return this.stand.menu.has(dishId) && !this.stand.soldOutDishIds.includes(dishId);
  }

  private pricingOf({ dishId }: BasketLine): DishPricing {
    const pricing = this.stand.menu.get(dishId);
    if (!pricing) {
      throw new BasketRefusedError('sold-out');
    }
    return pricing;
  }
}
