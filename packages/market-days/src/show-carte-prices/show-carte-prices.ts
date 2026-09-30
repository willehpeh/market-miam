import { Command } from '@nestjs/cqrs';

export class ShowCartePrices extends Command<void> {
  constructor(public readonly vendorId: string) {
    super();
  }
}
