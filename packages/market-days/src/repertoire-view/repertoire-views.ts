import { RepertoireView, RepertoireViewItem } from './repertoire-view';

export abstract class RepertoireViews {
  abstract add(vendorId: string, item: RepertoireViewItem): Promise<void>;
  abstract forVendor(vendorId: string): Promise<RepertoireView>;
  abstract clear(): Promise<void>;
}
