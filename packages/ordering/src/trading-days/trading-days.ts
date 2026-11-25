import { VendorId } from '@market-miam/shared-kernel';
import { TradingDay, UnscheduledDay } from '../order';

export abstract class TradingDays {
  abstract forVendorAtMarketOn(vendorId: VendorId, marketId: string, date: string): Promise<TradingDay | UnscheduledDay>;
}
