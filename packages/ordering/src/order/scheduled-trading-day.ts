import { Availability } from './availability';
import { OrderLine } from './held-order';
import { TradingDay } from './trading-day';

export type TradingDayFacts = {
  menuDishIds: string[];
  soldOutDishIds: string[];
  closed: boolean;
  ended: boolean;
};

export class ScheduledTradingDay implements TradingDay {
  constructor(private readonly facts: TradingDayFacts) {}

  availabilityOf(lines: OrderLine[]): Availability {
    if (this.facts.closed) {
      return 'closed';
    }
    if (this.facts.ended) {
      return 'ended';
    }
    return lines.every(line => this.offers(line)) ? 'available' : 'sold-out';
  }

  private offers({ dishId }: OrderLine): boolean {
    return this.facts.menuDishIds.includes(dishId) && !this.facts.soldOutDishIds.includes(dishId);
  }
}
