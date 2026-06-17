import { Command } from '@nestjs/cqrs';

export class UnplanItemFromMarketDay extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly itemId: string,
    readonly marketId: string,
    readonly date: string,
  ) { super(); }
}
