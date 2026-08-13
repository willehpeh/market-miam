import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { CatalogueFacade } from './catalogue.facade';
import { ItemRevision, NewItem } from './catalogue';
import { AddItem, BeginItem, catalogueFeature, ChangeItemPhoto, LoadCatalogue, ReorderItems, RetireItem, ReviseItem, UploadItemPhoto } from './catalogue.state';

@Injectable()
export class StoreCatalogueFacade implements CatalogueFacade {
  private readonly store = inject(Store);

  readonly items = this.store.selectSignal(catalogueFeature.selectItems);
  readonly loading = this.store.selectSignal(catalogueFeature.selectLoading);
  readonly photoUploading = this.store.selectSignal(catalogueFeature.selectPhotoUploading);
  readonly photoError = this.store.selectSignal(catalogueFeature.selectPhotoError);
  readonly photoTooLarge = this.store.selectSignal(catalogueFeature.selectPhotoTooLarge);
  readonly newPhotoReference = this.store.selectSignal(catalogueFeature.selectNewPhotoReference);

  load(): void {
    this.store.dispatch(LoadCatalogue());
  }

  beginItem(): void {
    this.store.dispatch(BeginItem());
  }

  uploadItemPhoto(itemId: string, file: File): void {
    this.store.dispatch(UploadItemPhoto({ itemId, file }));
  }

  addItem(item: NewItem): void {
    this.store.dispatch(AddItem(item));
  }

  reviseItem(revision: ItemRevision): void {
    this.store.dispatch(ReviseItem(revision));
  }

  changeItemPhoto(itemId: string, imageReference: string): void {
    this.store.dispatch(ChangeItemPhoto({ itemId, imageReference }));
  }

  reorderItems(itemIds: string[]): void {
    this.store.dispatch(ReorderItems({ itemIds }));
  }

  retireItem(itemId: string): void {
    this.store.dispatch(RetireItem({ itemId }));
  }
}
