import { Command } from '@nestjs/cqrs';

export class ChangeItemPhoto extends Command<void> {
  constructor(
    readonly itemId: string,
    readonly vendorId: string,
    readonly imageReference: string,
  ) { super(); }
}
