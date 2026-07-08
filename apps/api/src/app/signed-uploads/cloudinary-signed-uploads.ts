import { Clock } from '@market-miam/common';
import { cloudinarySignature } from './cloudinary-signature';
import { SignedParams, SignedUpload, SignedUploads } from './signed-uploads';

// The exact rendition the storefront renders (dashboard `<img>`). Eagerly generating it
// during the upload materialises the derived asset before the browser requests it, so the
// first photo doesn't paint a broken image while Cloudinary is still building it.
// Keep in lockstep with COVER_PHOTO_DISPLAY_TRANSFORMATION in the vendor frontend.
const COVER_PHOTO_DISPLAY_TRANSFORMATION = 'c_fill,w_1200,h_600';

export class CloudinarySignedUploads extends SignedUploads {
  constructor(
    private readonly cloudName: string,
    private readonly apiKey: string,
    private readonly apiSecret: string,
    private readonly clock: Clock,
  ) {
    super();
  }

  for(publicId: string): SignedUpload {
    const params: SignedParams = {
      timestamp: Math.floor(new Date(this.clock.now().value()).getTime() / 1000),
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      allowed_formats: 'jpg,png,webp',
      transformation: 'c_limit,w_2000',
      eager: COVER_PHOTO_DISPLAY_TRANSFORMATION,
    };
    return {
      cloudName: this.cloudName,
      apiKey: this.apiKey,
      signature: cloudinarySignature({ ...params }, this.apiSecret),
      params,
    };
  }
}
