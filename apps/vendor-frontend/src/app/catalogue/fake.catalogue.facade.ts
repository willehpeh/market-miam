import { Injectable, signal } from '@angular/core';
import { CatalogueFacade } from './catalogue.facade';
import { CatalogueItemView, NewDish } from './catalogue';

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
}
