import { BasketLine } from './basket-line';
import { MalformedBasketError } from './malformed-basket.error';

export class Basket {
  constructor(private readonly _lines: BasketLine[]) {
    if (_lines.length === 0 || _lines.some(line => line.quantity < 1)) {
      throw new MalformedBasketError();
    }
  }

  lines(): BasketLine[] {
    return this._lines;
  }
}
