import { OrderLine } from './held-order';
import { RefusalReason } from './refusal-reason';

export type TradingDayFacts = {
  soldOutDishIds: string[];
  closed: boolean;
  ended: boolean;
};

export class TradingDay {
  constructor(private readonly facts: TradingDayFacts) {}

  reasonToRefuse(lines: OrderLine[]): RefusalReason | undefined {
    if (this.facts.closed) {
      return 'closed';
    }
    if (this.facts.ended) {
      return 'ended';
    }
    return lines.some(line => this.facts.soldOutDishIds.includes(line.dishId)) ? 'sold-out' : undefined;
  }
}
