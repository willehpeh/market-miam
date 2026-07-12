import { Signal } from '@angular/core';
import { CatalogueItemView, DishRevision, NewDish } from './catalogue';

export abstract class CatalogueFacade {
  abstract readonly items: Signal<CatalogueItemView[]>;
  abstract readonly loading: Signal<boolean>;
  abstract readonly photoUploading: Signal<boolean>;
  abstract readonly photoError: Signal<boolean>;
  abstract readonly newPhotoReference: Signal<string>;

  abstract load(): void;
  abstract beginDish(): void;
  abstract uploadDishPhoto(itemId: string, file: File): void;
  abstract addDish(dish: NewDish): void;
  abstract reviseDish(revision: DishRevision): void;
}
