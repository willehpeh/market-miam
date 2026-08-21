import { Command } from '@nestjs/cqrs';

type SetMarketPricesParams = {
  vendorId: string;
  marketId: string;
  prices: Record<string, number | Record<string, number>>;
};

export class SetMarketPrices extends Command<void> {
  readonly vendorId: string;
  readonly marketId: string;
  readonly prices: Record<string, number | Record<string, number>>;

  constructor(params: SetMarketPricesParams) {
    super();
    this.vendorId = params.vendorId;
    this.marketId = params.marketId;
    this.prices = params.prices;
  }
}
