import { EmptyValueError } from '@market-monster/common';

export class InvalidQuantityError extends Error {
  constructor() {
    super('Quantity must be positive');
    this.name = 'InvalidQuantityError';
  }
}

export class PlannedItem {
  private readonly _itemId: string;
  private readonly _quantity?: number;

  constructor(itemId: string, quantity?: number) {
    const trimmed = itemId.trim();
    if (!trimmed) {
      throw new EmptyValueError();
    }
    if (quantity !== undefined && quantity <= 0) {
      throw new InvalidQuantityError();
    }
    this._itemId = trimmed;
    this._quantity = quantity;
  }

  itemId(): string {
    return this._itemId;
  }

  quantity(): number | undefined {
    return this._quantity;
  }
}
