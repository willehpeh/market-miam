import { Clock } from '@market-miam/common';
import { cloudinarySignature } from './cloudinary-signature';
import { SignedParams, SignedUpload, SignedUploads } from './signed-uploads';

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
    };
    return {
      cloudName: this.cloudName,
      apiKey: this.apiKey,
      signature: cloudinarySignature({ ...params }, this.apiSecret),
      params,
    };
  }
}
