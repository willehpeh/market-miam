import { EmptyValueError } from '@market-monster/common';

export class ItemName {
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

  equals(other: ItemName): boolean {
    return this._value === other._value;
  }
}
