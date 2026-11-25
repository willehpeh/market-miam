import { Availability } from './availability';
import { OrderLine } from './held-order';
import { TradingDay } from './trading-day';

export type Stand = {
  menuDishIds: string[];
  soldOutDishIds: string[];
  closed: boolean;
  ended: boolean;
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

  private offers({ dishId }: OrderLine): boolean {
    return this.stand.menuDishIds.includes(dishId) && !this.stand.soldOutDishIds.includes(dishId);
  }
}
