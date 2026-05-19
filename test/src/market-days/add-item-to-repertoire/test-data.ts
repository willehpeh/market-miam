import { AddItemToRepertoire } from '@market-monster/market-days';

export class TestAddItemToRepertoire {
  static valid(): AddItemToRepertoire {
    return new AddItemToRepertoire(
      'item-id',
      'vendor-id',
      'Item Name',
      'Item Description',
      500,
      'https://example.com/item-photo.jpg',
    );
  }

  static with(overrides: Partial<AddItemToRepertoire>): AddItemToRepertoire {
    const defaults = this.valid();
    return new AddItemToRepertoire(
      overrides.itemId ?? defaults.itemId,
      overrides.vendorId ?? defaults.vendorId,
      overrides.name ?? defaults.name,
      overrides.description ?? defaults.description,
      overrides.price ?? defaults.price,
      overrides.photoUrl ?? defaults.photoUrl,
    );
  }
}
