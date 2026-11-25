import { Command } from '@nestjs/cqrs';

export class PlaceOrder extends Command<void> {
  constructor(
    readonly sessionId: string,
    readonly accountId: string,
    readonly receivedAt: string,
  ) { super(); }
}
