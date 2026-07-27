import { Observable, of } from 'rxjs';
import { PhotoUploads, UploadedPhoto } from './photo-uploads';
import { SignedUpload } from './signed-upload';

export class FakePhotoUploads implements PhotoUploads {
  uploaded: File | undefined;

  upload(file: File, signed: SignedUpload): Observable<UploadedPhoto> {
    this.uploaded = file;
    return of({
      publicId: signed.params.public_id,
      secureUrl: `https://res.cloudinary.com/${signed.cloudName}/image/upload/${signed.params.public_id}`,
      version: 1,
    });
  }
}
