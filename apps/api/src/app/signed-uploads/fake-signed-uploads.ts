import { SignedUpload, SignedUploads } from './signed-uploads';

export class FakeSignedUploads extends SignedUploads {
  for(publicId: string): SignedUpload {
    return {
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      signature: `signed(${publicId})`,
      params: {
        timestamp: 1_700_000_000,
        public_id: publicId,
        overwrite: true,
        invalidate: true,
        allowed_formats: 'jpg,png,webp',
        transformation: 'c_limit,w_2000',
      },
    };
  }
}
