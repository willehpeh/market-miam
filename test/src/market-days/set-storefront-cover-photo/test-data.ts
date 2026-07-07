import { SetStorefrontCoverPhoto } from '@market-miam/market-days';

export class TestSetStorefrontCoverPhoto {
  static valid(): SetStorefrontCoverPhoto {
    return new SetStorefrontCoverPhoto(
      'vendor-id',
      'storefronts/vendor-id/cover-photo',
    );
  }

  static with(overrides: Partial<SetStorefrontCoverPhoto>): SetStorefrontCoverPhoto {
    const defaults = this.valid();
    return new SetStorefrontCoverPhoto(
      overrides.vendorId ?? defaults.vendorId,
      overrides.imageReference ?? defaults.imageReference,
    );
  }
}
