export class InvalidQuantityError extends Error {
  constructor() {
    super('Quantity must be positive');
    this.name = 'InvalidQuantityError';
  }
}

export class Quantity {
  private readonly _value: number;

  constructor(value: number) {
    if (value <= 0) {
      throw new InvalidQuantityError();
    }
    this._value = value;
  }

  value(): number {
    return this._value;
  }
}
