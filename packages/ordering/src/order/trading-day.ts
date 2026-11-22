import { OrderLine } from './held-order';
import { RefusalReason } from './refusal-reason';

export type TradingDayFacts = {
  soldOutDishIds: string[];
  closed: boolean;
  ended: boolean;
};

export class TradingDay {
  private readonly soldOut: Set<string>;
  private readonly closed: boolean;
  private readonly ended: boolean;

  constructor({ soldOutDishIds, closed, ended }: TradingDayFacts) {
    this.soldOut = new Set(soldOutDishIds);
    this.closed = closed;
    this.ended = ended;
  }

  refusalOf(lines: OrderLine[]): RefusalReason | undefined {
    if (this.closed) {
      return 'closed';
    }
    if (this.ended) {
      return 'ended';
    }
    return lines.some(line => this.soldOut.has(line.dishId)) ? 'sold-out' : undefined;
  }
}
