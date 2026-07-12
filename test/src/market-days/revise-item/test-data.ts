import { ReviseItem } from '@market-miam/market-days';

export class TestReviseItem {
  static valid(): ReviseItem {
    return new ReviseItem(
      'item-id',
      'vendor-id',
      'Revised Name',
      'Revised Description',
      750,
    );
  }

  static with(overrides: Partial<ReviseItem>): ReviseItem {
    const defaults = this.valid();
    return new ReviseItem(
      overrides.itemId ?? defaults.itemId,
      overrides.vendorId ?? defaults.vendorId,
      overrides.name ?? defaults.name,
      overrides.description ?? defaults.description,
      overrides.price ?? defaults.price,
    );
  }
}
