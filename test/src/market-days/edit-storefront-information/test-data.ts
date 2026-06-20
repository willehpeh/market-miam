import { EditStorefrontInformation } from '@market-monster/market-days';

export class TestEditStorefrontInformation {
  static valid(): EditStorefrontInformation {
    return new EditStorefrontInformation(
      'vendor-id',
      'Jimmy\'s Sandwiches',
      'The best you ever had',
    );
  }

  static with(overrides: Partial<EditStorefrontInformation>): EditStorefrontInformation {
    const defaults = this.valid();
    return new EditStorefrontInformation(
      overrides.vendorId ?? defaults.vendorId,
      overrides.name ?? defaults.name,
      overrides.description ?? defaults.description,
    );
  }
}
