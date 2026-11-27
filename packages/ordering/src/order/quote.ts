import { BasketOverCapError } from './basket-over-cap.error';
import { OrderLine } from './held-order';

const ORDER_CAP_IN_CENTS = 11999;

export class Quote {
  constructor(private readonly _lines: OrderLine[]) {
    if (this.total() > ORDER_CAP_IN_CENTS) {
      throw new BasketOverCapError();
    }
  }

  lines(): OrderLine[] {
    return this._lines;
  }

  private total(): number {
    return this._lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0);
  }
}
