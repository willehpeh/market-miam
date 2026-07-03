import { Observable } from 'rxjs';

export interface StorefrontView {
  name: string;
  description: string;
  imageReference: string;
}

export abstract class Storefront {
  abstract view(): Observable<StorefrontView>;
  abstract edit(name: string, description: string): Observable<void>;
}
