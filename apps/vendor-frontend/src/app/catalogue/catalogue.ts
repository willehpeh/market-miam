import { Observable } from 'rxjs';
import { SignedUpload } from '../storefront/signed-upload';

export interface CatalogueItemView {
  itemId: string;
  name: string;
  description: string;
  price: number;
  imageReference: string;
}

export interface CatalogueView {
  items: CatalogueItemView[];
}

export interface NewDish {
  itemId: string;
  name: string;
  description: string;
  price: number;
  imageReference?: string;
}

export abstract class Catalogue {
  abstract list(): Observable<CatalogueView>;
  abstract photoSignature(itemId: string): Observable<SignedUpload>;
  abstract add(dish: NewDish): Observable<void>;
}
