export class OrderId {
  constructor(private readonly _value: string) {}

  streamId(): string {
    return `ordering-order-${this._value}`;
  }

  value(): string {
    return this._value;
  }
}
