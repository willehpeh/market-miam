import { EmptyValueError } from '@market-monster/common';

export class MarketId {
  private readonly _value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new EmptyValueError();
    }
    this._value = trimmed;
  }

  value(): string {
    return this._value;
  }
}
