import { Command } from '@nestjs/cqrs';

export class EraseVendor extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly erasedAt: string,
  ) { super(); }
}
