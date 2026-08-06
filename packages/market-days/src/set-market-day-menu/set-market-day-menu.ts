import { Command } from '@nestjs/cqrs';

type SetMarketDayMenuParams = {
  vendorId: string;
  itemIds: string[];
  marketId: string;
  date: string;
};

export class SetMarketDayMenu extends Command<void> {
  readonly vendorId: string;
  readonly itemIds: string[];
  readonly marketId: string;
  readonly date: string;

  constructor(params: SetMarketDayMenuParams) {
    super();
    this.vendorId = params.vendorId;
    this.itemIds = params.itemIds;
    this.marketId = params.marketId;
    this.date = params.date;
  }
}
