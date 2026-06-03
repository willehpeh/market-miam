import { RepertoireView, RepertoireViewItem } from './repertoire-view';

export abstract class RepertoireViews {
  abstract addItemToRepertoire(item: RepertoireViewItem, vendorId: string): Promise<void>;
  abstract forVendor(vendorId: string): Promise<RepertoireView>;
  abstract clear(): Promise<void>;
}
