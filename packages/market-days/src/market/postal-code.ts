import { InvalidPostalCodeError } from './invalid-postal-code.error';

const FIVE_DIGITS = /^\d{5}$/;

export class PostalCode {
  private readonly _value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    if (!FIVE_DIGITS.test(trimmed)) {
      throw new InvalidPostalCodeError();
    }
    this._value = trimmed;
  }

  value(): string {
    return this._value;
  }
}
