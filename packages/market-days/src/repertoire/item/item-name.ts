export class ItemName {
  private readonly _value: string;

  constructor(value: string) {
    this._value = value;
  }

  value(): string {
    return this._value;
  }

  equals(other: ItemName): boolean {
    return this._value === other._value;
  }
}
