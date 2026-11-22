import { VendorId } from '@market-miam/shared-kernel';
import { HeldOrder, RefusalReason } from '../order';

export abstract class TradingDays {
  abstract refusalOf(vendorId: VendorId, order: HeldOrder): Promise<RefusalReason | undefined>;
}
