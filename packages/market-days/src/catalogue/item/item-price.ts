import { InvalidPriceError } from './invalid-price.error';

export class ItemPrice {
  private readonly _value: number;

  constructor(value: number) {
    if (value < 0) {
      throw new InvalidPriceError();
    }
    this._value = value;
  }

  value(): number {
    return this._value;
  }
}
