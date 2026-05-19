import { Command } from '@nestjs/cqrs';

export class AddItemToRepertoire extends Command<void> {
  constructor(
    readonly itemId: string,
    readonly vendorId: string,
    readonly name: string,
    readonly description: string,
    readonly price: number,
    readonly photoUrl: string,
  ) { super(); }
}
