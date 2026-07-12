import { Command } from '@nestjs/cqrs';

type MarketDetails = {
  id: string;
  name: string;
  streetAddress?: string;
  codePostal: string;
  town: string;
  pitch?: string;
}

type AmendMarketScheduleParams = {
  vendorId: string;
  scheduleId: string;
  startDate: string;
  market: MarketDetails;
  days: { day: string; startTime?: string; endTime?: string }[];
  frequency?: { weeks: number } | 'once';
}

export class AmendMarketSchedule extends Command<void> {
  readonly vendorId: string;
  readonly scheduleId: string;
  readonly startDate: string;
  readonly market: MarketDetails;
  readonly days: { day: string; startTime?: string; endTime?: string }[];
  readonly frequency?: { weeks: number } | 'once';

  constructor(params: AmendMarketScheduleParams) {
    super();
    this.vendorId = params.vendorId;
    this.scheduleId = params.scheduleId;
    this.startDate = params.startDate;
    this.market = params.market;
    this.days = params.days;
    this.frequency = params.frequency;
  }
}
