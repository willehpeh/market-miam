import { Command } from '@nestjs/cqrs';

export class PlanItemsForMarketDay extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly items: { itemId: string; quantity?: number }[],
    readonly marketId: string,
    readonly date: string,
  ) { super(); }
}
