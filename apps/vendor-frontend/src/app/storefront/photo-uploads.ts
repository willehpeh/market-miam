import { Observable } from 'rxjs';
import { SignedUpload } from './signed-upload';

export interface UploadedPhoto {
  publicId: string;
  secureUrl: string;
  version: number;
}

export abstract class PhotoUploads {
  abstract upload(file: File, signed: SignedUpload): Observable<UploadedPhoto>;
}
