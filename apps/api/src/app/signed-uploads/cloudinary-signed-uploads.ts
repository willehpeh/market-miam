import { Clock } from '@market-miam/common';
import { cloudinarySignature } from './cloudinary-signature';
import { CloudinaryUploadParams, CloudinarySignedUpload, SignedUploads } from './signed-uploads';

// Eagerly generating a rendition during the upload materialises the derived asset before
// the browser requests it, so the first photo doesn't paint a broken image while
// Cloudinary is still building it.
//
// The format is pinned (f_webp) rather than negotiated (f_auto) on purpose: f_auto has no
// effect in an eager transform — with no requesting browser at upload time there is nothing
// to pre-generate — so an f_auto rendition would never be warmed and the first-load race
// would return. A concrete format keeps the eager asset identical to what we deliver.
//
// ponytail: no live rendition matches this size any more — the vendor form previews at
// c_fill,w_400,h_300 and the customer covers negotiate f_auto — so the warm no longer
// covers the first paint it was built for. Re-point it at what the frontends render.
const COVER_PHOTO_DISPLAY_TRANSFORMATION = 'c_fill,w_1200,h_600,q_auto,f_webp';

export class CloudinarySignedUploads extends SignedUploads {
  constructor(
    private readonly cloudName: string,
    private readonly apiKey: string,
    private readonly apiSecret: string,
    private readonly clock: Clock,
  ) {
    super();
  }

  for(publicId: string): CloudinarySignedUpload {
    // In a dynamic-folder product environment the public id no longer places the asset:
    // it only names it for delivery, so without this every photo lands in the home folder.
    const assetFolder = publicId.split('/').slice(0, -1).join('/');
    const params: CloudinaryUploadParams = {
      timestamp: Math.floor(new Date(this.clock.now().value()).getTime() / 1000),
      public_id: publicId,
      ...(assetFolder && { asset_folder: assetFolder }),
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
