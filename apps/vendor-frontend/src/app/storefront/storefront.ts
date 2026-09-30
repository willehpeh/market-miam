import { Observable } from 'rxjs';
import { SignedUpload } from './signed-upload';

export interface StorefrontView {
  name: string;
  description: string;
  phone: string;
  imageReference: string;
  subdomain: string | null;
  published: boolean;
  // Whether the public carte quotes its prices. The vendor's choice, opted in by default.
  cartePricesVisible: boolean;
}

export abstract class Storefront {
  abstract view(): Observable<StorefrontView>;
  abstract edit(name: string, description: string, phone: string): Observable<void>;
  abstract coverPhotoSignature(): Observable<SignedUpload>;
  abstract setCoverPhoto(version: number): Observable<void>;
  abstract publish(): Observable<void>;
  abstract setCartePricesVisible(visible: boolean): Observable<void>;
}
