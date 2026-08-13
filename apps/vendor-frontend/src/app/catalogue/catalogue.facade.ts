import { Signal } from '@angular/core';
import { CatalogueItemView, ItemRevision, NewItem } from './catalogue';

export abstract class CatalogueFacade {
  abstract readonly items: Signal<CatalogueItemView[]>;
  abstract readonly loading: Signal<boolean>;
  abstract readonly photoUploading: Signal<boolean>;
  abstract readonly photoError: Signal<boolean>;
  abstract readonly photoTooLarge: Signal<boolean>;
  abstract readonly newPhotoReference: Signal<string>;

  abstract load(): void;
  abstract beginItem(): void;
  abstract uploadItemPhoto(itemId: string, file: File): void;
  abstract addItem(item: NewItem): void;
  abstract reviseItem(revision: ItemRevision): void;
  abstract changeItemPhoto(itemId: string, imageReference: string): void;
  abstract reorderItems(itemIds: string[]): void;
  abstract retireItem(itemId: string): void;
}
