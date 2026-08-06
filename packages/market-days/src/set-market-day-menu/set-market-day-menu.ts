import { Command } from '@nestjs/cqrs';

export class SetMarketDayMenu extends Command<void> {
  constructor(
    readonly menu: {
      vendorId: string;
      itemIds: string[];
      marketId: string;
      date: string;
    },
  ) { super(); }
}
