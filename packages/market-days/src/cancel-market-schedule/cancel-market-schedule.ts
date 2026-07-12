import { Command } from '@nestjs/cqrs';

type CancelMarketScheduleParams = {
  vendorId: string;
  scheduleId: string;
}

export class CancelMarketSchedule extends Command<void> {
  readonly vendorId: string;
  readonly scheduleId: string;

  constructor(params: CancelMarketScheduleParams) {
    super();
    this.vendorId = params.vendorId;
    this.scheduleId = params.scheduleId;
  }
}
