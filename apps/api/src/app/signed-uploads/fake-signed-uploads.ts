import {
  COVER_PHOTO_PREVIEW_TRANSFORMATION,
  ITEM_PHOTO_PREVIEW_TRANSFORMATION,
  ITEM_PHOTO_THUMBNAIL_TRANSFORMATION,
} from '@market-miam/common';
import { CloudinarySignedUpload, SignedUploads } from './signed-uploads';

export class FakeSignedUploads extends SignedUploads {
  forCoverPhoto(publicId: string): CloudinarySignedUpload {
    return this.signed(publicId, COVER_PHOTO_PREVIEW_TRANSFORMATION);
  }

  forItemPhoto(publicId: string): CloudinarySignedUpload {
    return this.signed(publicId, `${ITEM_PHOTO_PREVIEW_TRANSFORMATION}|${ITEM_PHOTO_THUMBNAIL_TRANSFORMATION}`);
  }

  private signed(publicId: string, eager: string): CloudinarySignedUpload {
    return {
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      signature: `signed(${publicId})`,
      params: {
        timestamp: 1_700_000_000,
        public_id: publicId,
        asset_folder: publicId.split('/').slice(0, -1).join('/'),
        overwrite: true,
        invalidate: true,
        allowed_formats: 'jpg,png,webp',
        transformation: 'c_limit,w_2000',
        eager,
      },
    };
  }
}
