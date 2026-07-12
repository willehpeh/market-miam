import { InvalidPriceError } from '../errors/invalid-price.error';

export class ItemPrice {
  private readonly _value: number;

  constructor(value: number) {
    if (value < 0 || !Number.isInteger(value)) {
      throw new InvalidPriceError();
    }
    this._value = value;
  }

  value(): number {
    return this._value;
  }
}
