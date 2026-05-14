export class Url {
  private readonly _value: string;

  constructor(value: string) {
    this._value = value;
  }

  value(): string {
    return this._value;
  }
}
