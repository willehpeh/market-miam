import { Query } from '@nestjs/cqrs';
import { VendorMarketPricesView } from './market-prices-view';

export class FindMarketPrices extends Query<VendorMarketPricesView> {
  constructor(public readonly vendorId: string) {
    super();
  }
}
