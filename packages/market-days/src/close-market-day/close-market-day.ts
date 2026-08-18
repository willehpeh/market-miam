import { Command } from '@nestjs/cqrs';

// No time field: the tap is stamped on arrival from the server's Clock, so a device
// clock can never contradict the day's own guards (LIVE-MODE-PLAN.md decisions 35, 44).
export class CloseMarketDay extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly marketId: string,
    readonly date: string,
  ) { super(); }
}
