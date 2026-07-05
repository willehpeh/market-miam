import { Observable } from 'rxjs';
import { SignedUpload } from './signed-upload';

export interface StorefrontView {
  name: string;
  description: string;
  phone: string;
  imageReference: string;
}

export abstract class Storefront {
  abstract view(): Observable<StorefrontView>;
  abstract edit(name: string, description: string, phone: string): Observable<void>;
  abstract coverPhotoSignature(): Observable<SignedUpload>;
  abstract setCoverPhoto(): Observable<void>;
}
