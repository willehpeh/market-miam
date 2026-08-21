import { InvalidPriceError } from '../errors/invalid-price.error';

// Cents, never fractions and never negative — a dish's price and a variant's alike, which
// is why it is not called ItemPrice. That name is kept for what an item costs at a given
// market (ADR 0052), which is a different thing: one number, or one per variant.
export class Price {
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
