import { Injectable, signal } from '@angular/core';
import { CatalogueFacade } from './catalogue.facade';
import { CatalogueItemView, ItemRevision, NewItem } from './catalogue';

@Injectable()
export class FakeCatalogueFacade implements CatalogueFacade {
  readonly items = signal<CatalogueItemView[]>([]);
  readonly loading = signal(false);
  readonly photoUploading = signal(false);
  readonly photoError = signal(false);
  readonly photoTooLarge = signal(false);
  readonly newPhotoReference = signal('');
  loaded = false;
  began = false;
  uploadedPhoto: { itemId: string; file: File } | undefined;
  addedItem: NewItem | undefined;
  revisedItem: ItemRevision | undefined;
  changedPhoto: { itemId: string; imageReference: string } | undefined;
  reorderedItems: string[] | undefined;
  retiredItem: string | undefined;

  load(): void {
    this.loaded = true;
  }

  beginItem(): void {
    this.began = true;
  }

  uploadItemPhoto(itemId: string, file: File): void {
    this.uploadedPhoto = { itemId, file };
  }

  addItem(item: NewItem): void {
    this.addedItem = item;
  }

  reviseItem(revision: ItemRevision): void {
    this.revisedItem = revision;
  }

  changeItemPhoto(itemId: string, imageReference: string): void {
    this.changedPhoto = { itemId, imageReference };
  }

  reorderItems(itemIds: string[]): void {
    this.reorderedItems = itemIds;
  }

  retireItem(itemId: string): void {
    this.retiredItem = itemId;
  }
}
