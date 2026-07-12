import { Command } from '@nestjs/cqrs';

type DeclareAbsenceParams = {
  vendorId: string;
  scheduleId: string;
  from: string;
  to: string;
}

export class DeclareAbsence extends Command<void> {
  readonly vendorId: string;
  readonly scheduleId: string;
  readonly from: string;
  readonly to: string;

  constructor(params: DeclareAbsenceParams) {
    super();
    this.vendorId = params.vendorId;
    this.scheduleId = params.scheduleId;
    this.from = params.from;
    this.to = params.to;
  }
}
