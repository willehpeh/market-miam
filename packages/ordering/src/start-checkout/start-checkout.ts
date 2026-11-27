import { Command } from '@nestjs/cqrs';
import { BasketLine } from '../order';

export class StartCheckout extends Command<string> {
  constructor(
    readonly vendorId: string,
    readonly marketId: string,
    readonly basket: BasketLine[],
  ) { super(); }
}
