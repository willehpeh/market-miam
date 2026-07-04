import { Observable } from 'rxjs';

export interface StorefrontView {
  name: string;
  description: string;
  phone: string;
  imageReference: string;
}

export abstract class Storefront {
  abstract view(): Observable<StorefrontView>;
  abstract edit(name: string, description: string, phone: string): Observable<void>;
}
