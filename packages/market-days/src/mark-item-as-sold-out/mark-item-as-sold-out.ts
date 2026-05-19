import { Command } from '@nestjs/cqrs';

export class MarkItemAsSoldOut extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly itemId: string,
    readonly marketId: string,
    readonly date: string,
    readonly time: string,
  ) { super(); }
}
