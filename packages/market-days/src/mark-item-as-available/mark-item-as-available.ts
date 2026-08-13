import { Command } from '@nestjs/cqrs';

// No time field: the tap is stamped on arrival from the server's Clock, so a device
// clock can never write the availability timeline (LIVE-MODE-PLAN.md decision 35).
export class MarkItemAsAvailable extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly itemId: string,
    readonly marketId: string,
    readonly date: string,
  ) { super(); }
}
