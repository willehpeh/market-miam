import { Command } from '@nestjs/cqrs';

export class RecordVendorAccountOpened extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly openedAt: string,
  ) { super(); }
}
