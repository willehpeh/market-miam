import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { CatalogueFacade } from './catalogue.facade';
import { DishRevision, NewDish } from './catalogue';
import { AddDish, BeginDish, catalogueFeature, LoadCatalogue, ReviseDish, UploadDishPhoto } from './catalogue.state';

@Injectable()
export class StoreCatalogueFacade implements CatalogueFacade {
  private readonly store = inject(Store);

  readonly items = this.store.selectSignal(catalogueFeature.selectItems);
  readonly loading = this.store.selectSignal(catalogueFeature.selectLoading);
  readonly photoUploading = this.store.selectSignal(catalogueFeature.selectPhotoUploading);
  readonly photoError = this.store.selectSignal(catalogueFeature.selectPhotoError);
  readonly newPhotoReference = this.store.selectSignal(catalogueFeature.selectNewPhotoReference);

  load(): void {
    this.store.dispatch(LoadCatalogue());
  }

  beginDish(): void {
    this.store.dispatch(BeginDish());
  }

  uploadDishPhoto(itemId: string, file: File): void {
    this.store.dispatch(UploadDishPhoto({ itemId, file }));
  }

  addDish(dish: NewDish): void {
    this.store.dispatch(AddDish(dish));
  }

  reviseDish(revision: DishRevision): void {
    this.store.dispatch(ReviseDish(revision));
  }
}
