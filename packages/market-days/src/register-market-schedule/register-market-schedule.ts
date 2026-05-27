import { Command } from '@nestjs/cqrs';

type RegisterMarketScheduleParams = {
  vendorId: string;
  scheduleId: string;
  scheduleName: string;
  startDate: string;
  marketId: string;
  days: { day: string; startTime?: string; endTime?: string }[];
  frequency?: { weeks: number };
}

export class RegisterMarketSchedule extends Command<void> {
  readonly vendorId: string;
  readonly scheduleId: string;
  readonly scheduleName: string;
  readonly startDate: string;
  readonly marketId: string;
  readonly days: { day: string; startTime?: string; endTime?: string }[];
  readonly frequency?: { weeks: number };

  constructor(params: RegisterMarketScheduleParams) {
    super();
    this.vendorId = params.vendorId;
    this.scheduleId = params.scheduleId;
    this.scheduleName = params.scheduleName;
    this.startDate = params.startDate;
    this.marketId = params.marketId;
    this.days = params.days;
    this.frequency = params.frequency;
  }
}
