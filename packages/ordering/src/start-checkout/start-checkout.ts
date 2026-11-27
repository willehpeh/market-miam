import { Command } from '@nestjs/cqrs';
import { BasketLine } from '../order';

export class StartCheckout extends Command<string> {
  constructor(
    readonly subdomain: string,
    readonly marketId: string,
    readonly basket: BasketLine[],
  ) { super(); }
}
