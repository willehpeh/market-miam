import { Command } from '@nestjs/cqrs';

export class RetireItem extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly itemId: string,
  ) { super(); }
}