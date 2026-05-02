export class ItemPrice {
  private readonly _value: number;

  constructor(value: number) {
    this._value = value;
  }

  value(): number {
    return this._value;
  }

  equals(other: ItemPrice): boolean {
    return this._value === other._value;
  }
}
