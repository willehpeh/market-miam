import { Availability } from './availability';
import { Basket } from './basket';
import { BasketLine } from './basket-line';
import { BasketRefusedError } from './basket-refused.error';
import { DishOnMenu, SoldOutDish } from './dish-on-menu';
import { Quote } from './quote';
import { TradingDay } from './trading-day';

const OFF_THE_MENU = new SoldOutDish();

export type Stand = {
  menu: Map<string, DishOnMenu>;
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
    return lines.every(line => this.dishFor(line).isOnSale()) ? 'available' : 'sold-out';
  }

  quote(basket: Basket): Quote {
    const lines = basket.lines();
    const availability = this.availabilityOf(lines);
    if (availability !== 'available') {
      throw new BasketRefusedError(availability);
    }
    return new Quote(lines.map(line => ({ ...line, unitPrice: this.dishFor(line).unitPriceFor(line) })));
  }

  private dishFor({ dishId }: BasketLine): DishOnMenu {
    return this.stand.menu.get(dishId) ?? OFF_THE_MENU;
  }
}
