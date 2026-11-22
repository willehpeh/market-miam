import { OrderLine } from './held-order';
import { RefusalReason } from './refusal-reason';

export class TradingDay {
  private readonly soldOut: Set<string>;

  constructor(soldOutDishIds: string[], private readonly closed: boolean) {
    this.soldOut = new Set(soldOutDishIds);
  }

  refusalOf(lines: OrderLine[]): RefusalReason | undefined {
    if (lines.some(line => this.soldOut.has(line.dishId))) {
      return 'sold-out';
    }
    return this.closed ? 'closed' : undefined;
  }
}
