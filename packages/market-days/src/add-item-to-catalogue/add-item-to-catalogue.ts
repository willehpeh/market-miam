import { Command } from '@nestjs/cqrs';

export class AddItemToCatalogue extends Command<void> {
  constructor(
    readonly itemId: string,
    readonly vendorId: string,
    readonly name: string,
    readonly description: string,
    readonly price: number,
    readonly imageReference: string,
  ) { super(); }
}
