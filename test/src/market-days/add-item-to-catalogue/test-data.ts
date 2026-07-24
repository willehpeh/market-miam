import { AddItemToCatalogue, VariantInput } from '@market-miam/market-days';

export class TestAddItemToCatalogue {
  static simple(): AddItemToCatalogue & { price: number } {
    return new AddItemToCatalogue({
      itemId: 'item-id',
      vendorId: 'vendor-id',
      name: 'Item Name',
      description: 'Item Description',
      price: 500,
      imageReference: 'market-miam/items/item-photo',
    }) as AddItemToCatalogue & { price: number };
  }

  static with(overrides: Partial<AddItemToCatalogue>): AddItemToCatalogue {
    const defaults = this.simple();
    return new AddItemToCatalogue({
      itemId: overrides.itemId ?? defaults.itemId,
      vendorId: overrides.vendorId ?? defaults.vendorId,
      name: overrides.name ?? defaults.name,
      description: overrides.description ?? defaults.description,
      price: overrides.price ?? defaults.price,
      imageReference: overrides.imageReference ?? defaults.imageReference,
    });
  }

  static withVariants(variants: VariantInput[]): AddItemToCatalogue {
    return new AddItemToCatalogue({
      itemId: 'item-id',
      vendorId: 'vendor-id',
      name: 'Item Name',
      description: 'Item Description',
      imageReference: 'market-miam/items/item-photo',
      variants,
    });
  }
}
