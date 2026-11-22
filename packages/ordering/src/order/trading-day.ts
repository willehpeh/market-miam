import { OrderLine } from './held-order';
import { RefusalReason } from './refusal-reason';

export class TradingDay {
  private readonly soldOut: Set<string>;

  constructor(soldOutDishIds: string[] = []) {
    this.soldOut = new Set(soldOutDishIds);
  }

  refusalOf(lines: OrderLine[]): RefusalReason | undefined {
    return lines.some(line => this.soldOut.has(line.dishId)) ? 'sold-out' : undefined;
  }
}
