import { Command } from '@nestjs/cqrs';

type MarketDetails = {
  id: string;
  name: string;
  streetAddress?: string;
  codePostal: string;
  town: string;
  pitch?: string;
}

type RegisterMarketScheduleParams = {
  vendorId: string;
  scheduleId: string;
  scheduleName: string;
  startDate: string;
  market: MarketDetails;
  days: { day: string; startTime?: string; endTime?: string }[];
  frequency?: { weeks: number };
}

export class RegisterMarketSchedule extends Command<void> {
  readonly vendorId: string;
  readonly scheduleId: string;
  readonly scheduleName: string;
  readonly startDate: string;
  readonly market: MarketDetails;
  readonly days: { day: string; startTime?: string; endTime?: string }[];
  readonly frequency?: { weeks: number };

  constructor(params: RegisterMarketScheduleParams) {
    super();
    this.vendorId = params.vendorId;
    this.scheduleId = params.scheduleId;
    this.scheduleName = params.scheduleName;
    this.startDate = params.startDate;
    this.market = params.market;
    this.days = params.days;
    this.frequency = params.frequency;
  }
}
