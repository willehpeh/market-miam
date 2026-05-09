import { AddItemToRepertoire } from '@market-monster/market-days';

export class TestAddItemToRepertoire {
  static valid(): AddItemToRepertoire {
    return {
      itemId: 'item-id',
      vendorId: 'vendor-id',
      name: 'Item Name',
      description: 'Item Description',
      price: 500,
      photoUrl: 'https://example.com/item-photo.jpg',
    };
  }

  static with(overrides: Partial<AddItemToRepertoire>): AddItemToRepertoire {
    return { ...this.valid(), ...overrides };
  }
}
