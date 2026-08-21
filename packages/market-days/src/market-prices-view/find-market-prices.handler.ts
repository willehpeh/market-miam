import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindMarketPrices } from './find-market-prices';
import { VendorMarketPricesView } from './market-prices-view';
import { MarketPricesViews } from './market-prices-views';

@QueryHandler(FindMarketPrices)
export class FindMarketPricesHandler implements IQueryHandler<FindMarketPrices> {
  constructor(private readonly views: MarketPricesViews) {}

  async execute(query: FindMarketPrices): Promise<VendorMarketPricesView> {
    return { markets: await this.views.forVendor(query.vendorId) };
  }
}
