import { RepertoireView } from './repertoire-view';

export abstract class RepertoireViews {
  abstract forVendor(vendorId: string): Promise<RepertoireView>;
}
