import { Command } from '@nestjs/cqrs';

export class PlaceOrder extends Command<void> {
  constructor(
    readonly checkoutId: string,
    readonly accountId: string,
    readonly receivedAt: string,
  ) { super(); }
}
