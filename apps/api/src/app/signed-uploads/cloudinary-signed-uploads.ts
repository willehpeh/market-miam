import {
  Clock,
  COVER_PHOTO_PREVIEW_TRANSFORMATION,
  ITEM_PHOTO_PREVIEW_TRANSFORMATION,
  ITEM_PHOTO_THUMBNAIL_TRANSFORMATION,
  PHOTO_UPLOAD_MAX_EDGE,
} from '@market-miam/common';
import { cloudinarySignature } from './cloudinary-signature';
import { CloudinaryUploadParams, CloudinarySignedUpload, SignedUploads } from './signed-uploads';

// Generating a transformation during the upload (Cloudinary's `eager`) makes the image
// exist before the browser asks for it, so the vendor's first look at a new photo doesn't
// paint a broken image while Cloudinary is still building it. Each upload generates the
// transformations the vendor app shows it through next, shared via @market-miam/common so
// the two can't drift apart; several go in one `eager` string, separated by `|`.
//
// Those transformations pin their format (f_webp) rather than negotiate it (f_auto) on
// purpose: f_auto has no effect in an eager transformation — with no requesting browser at
// upload time there is nothing to choose a format for — so an f_auto image would never be
// ready ahead of the request. The customer storefront does negotiate, and is left to
// Cloudinary's first request: its readers arrive long after the upload.
export class CloudinarySignedUploads extends SignedUploads {
  constructor(
    private readonly cloudName: string,
    private readonly apiKey: string,
    private readonly apiSecret: string,
    private readonly clock: Clock,
  ) {
    super();
  }

  forCoverPhoto(publicId: string): CloudinarySignedUpload {
    return this.signed(publicId, [COVER_PHOTO_PREVIEW_TRANSFORMATION]);
  }

  // The form previews the photo, and saving lands on the list, which shows its thumbnail.
  forItemPhoto(publicId: string): CloudinarySignedUpload {
    return this.signed(publicId, [ITEM_PHOTO_PREVIEW_TRANSFORMATION, ITEM_PHOTO_THUMBNAIL_TRANSFORMATION]);
  }

  private signed(publicId: string, generatedOnUpload: string[]): CloudinarySignedUpload {
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
      transformation: `c_limit,w_${PHOTO_UPLOAD_MAX_EDGE}`,
      eager: generatedOnUpload.join('|'),
    };
    return {
      cloudName: this.cloudName,
      apiKey: this.apiKey,
      signature: cloudinarySignature({ ...params }, this.apiSecret),
      params,
    };
  }
}
