import { ReviseItem } from '@market-miam/market-days';

export class TestReviseItem {
  static valid(): ReviseItem {
    return new ReviseItem({
      itemId: 'item-id',
      vendorId: 'vendor-id',
      name: 'Revised Name',
      description: 'Revised Description',
      price: 750,
    });
  }

  static with(overrides: Partial<ReviseItem>): ReviseItem {
    const defaults = this.valid();
    return new ReviseItem({
      itemId: overrides.itemId ?? defaults.itemId,
      vendorId: overrides.vendorId ?? defaults.vendorId,
      name: overrides.name ?? defaults.name,
      description: overrides.description ?? defaults.description,
      price: overrides.price ?? defaults.price,
    });
  }

  static withVariants(itemId: string, variants: { name: string; description: string; price: number }[]): ReviseItem {
    return new ReviseItem({
      itemId,
      vendorId: 'vendor-id',
      name: 'Revised Name',
      description: 'Revised Description',
      variants,
    });
  }
}
