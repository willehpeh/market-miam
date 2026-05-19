import { Command } from '@nestjs/cqrs';

export class RegisterMarketSchedule extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly scheduleId: string,
    readonly scheduleName: string,
    readonly marketId: string,
    readonly days: { day: string; startTime?: string; endTime?: string }[],
    readonly every?: { weeks: number },
  ) { super(); }
}
