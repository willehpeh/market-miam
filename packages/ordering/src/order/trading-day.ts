import { OrderLine } from './held-order';
import { RefusalReason } from './refusal-reason';

export type TradingDayFacts = {
  soldOutDishIds: string[];
  closed: boolean;
};

export class TradingDay {
  private readonly soldOut: Set<string>;
  private readonly closed: boolean;

  constructor({ soldOutDishIds, closed }: TradingDayFacts) {
    this.soldOut = new Set(soldOutDishIds);
    this.closed = closed;
  }

  refusalOf(lines: OrderLine[]): RefusalReason | undefined {
    if (lines.some(line => this.soldOut.has(line.dishId))) {
      return 'sold-out';
    }
    return this.closed ? 'closed' : undefined;
  }
}
