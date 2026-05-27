import { Command } from '@nestjs/cqrs';

type RegisterMarketScheduleParams = {
  vendorId: string;
  scheduleId: string;
  scheduleName: string;
  marketId: string;
  days: { day: string; startTime?: string; endTime?: string }[];
  every?: { weeks: number };
}

export class RegisterMarketSchedule extends Command<void> {
  readonly vendorId: string;
  readonly scheduleId: string;
  readonly scheduleName: string;
  readonly marketId: string;
  readonly days: { day: string; startTime?: string; endTime?: string }[];
  readonly every?: { weeks: number };

  constructor(params: RegisterMarketScheduleParams) {
    super();
    this.vendorId = params.vendorId;
    this.scheduleId = params.scheduleId;
    this.scheduleName = params.scheduleName;
    this.marketId = params.marketId;
    this.days = params.days;
    this.every = params.every;
  }
}
