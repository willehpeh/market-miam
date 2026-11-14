import { Command } from '@nestjs/cqrs';

export class RecordVendorAccountClosed extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly closedAt: string,
  ) { super(); }
}
