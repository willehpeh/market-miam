import { Observable } from 'rxjs';

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

export abstract class Catalogue {
  abstract list(): Observable<CatalogueView>;
}
