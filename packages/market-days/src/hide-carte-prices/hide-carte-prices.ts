import { Command } from '@nestjs/cqrs';

export class HideCartePrices extends Command<void> {
  constructor(public readonly vendorId: string) {
    super();
  }
}
