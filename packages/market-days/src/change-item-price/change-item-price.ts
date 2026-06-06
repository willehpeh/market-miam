import { Command } from '@nestjs/cqrs';

export class ChangeItemPrice extends Command<void> {
  constructor(
    readonly itemId: string,
    readonly price: number,
    readonly vendorId: string,
  ) { super(); }
}
