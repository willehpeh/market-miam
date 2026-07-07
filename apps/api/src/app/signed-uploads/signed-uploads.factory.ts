import { ConfigService } from '@nestjs/config';
import { Clock } from '@market-miam/common';
import { CloudinarySignedUploads } from './cloudinary-signed-uploads';
import { SignedUploads } from './signed-uploads';

export function signedUploadsFor(config: ConfigService, clock: Clock): SignedUploads {
  return new CloudinarySignedUploads(
    config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
    config.getOrThrow<string>('CLOUDINARY_API_KEY'),
    config.getOrThrow<string>('CLOUDINARY_API_SECRET'),
    clock,
  );
}
