import { RepertoireViewItem } from './repertoire-view';

export abstract class RepertoireViewStore {
  abstract addItemToRepertoire(item: RepertoireViewItem, vendorId: string): Promise<void>;
  abstract updateItemPrice(itemId: string, newPrice: number, vendorId: string): Promise<void>;
  abstract clear(): Promise<void>;
}
