export class ItemPhotoUrl {
  private readonly _value: string;

  constructor(value: string) {
    this._value = value;
  }

  value(): string {
    return this._value;
  }

  equals(other: ItemPhotoUrl): boolean {
    return this._value === other._value;
  }
}
