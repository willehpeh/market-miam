import { Observable } from 'rxjs';
import { SignedUpload } from './signed-upload';

export interface StorefrontView {
  name: string;
  description: string;
  phone: string;
  imageReference: string;
  subdomain: string | null;
  published: boolean;
}

export abstract class Storefront {
  abstract view(): Observable<StorefrontView>;
  abstract edit(name: string, description: string, phone: string): Observable<void>;
  abstract coverPhotoSignature(): Observable<SignedUpload>;
  abstract setCoverPhoto(version: number): Observable<void>;
  abstract publish(): Observable<void>;
}
