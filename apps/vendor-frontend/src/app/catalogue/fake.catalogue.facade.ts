import { Injectable, signal } from '@angular/core';
import { CatalogueFacade } from './catalogue.facade';
import { CatalogueItemView, DishRevision, NewDish } from './catalogue';

@Injectable()
export class FakeCatalogueFacade implements CatalogueFacade {
  readonly items = signal<CatalogueItemView[]>([]);
  readonly loading = signal(false);
  readonly photoUploading = signal(false);
  readonly photoError = signal(false);
  readonly newPhotoReference = signal('');
  loaded = false;
  began = false;
  uploadedPhoto: { itemId: string; file: File } | undefined;
  addedDish: NewDish | undefined;
  revisedDish: DishRevision | undefined;
  changedPhoto: { itemId: string; imageReference: string } | undefined;

  load(): void {
    this.loaded = true;
  }

  beginDish(): void {
    this.began = true;
  }

  uploadDishPhoto(itemId: string, file: File): void {
    this.uploadedPhoto = { itemId, file };
  }

  addDish(dish: NewDish): void {
    this.addedDish = dish;
  }

  reviseDish(revision: DishRevision): void {
    this.revisedDish = revision;
  }

  changeDishPhoto(itemId: string, imageReference: string): void {
    this.changedPhoto = { itemId, imageReference };
  }
}
