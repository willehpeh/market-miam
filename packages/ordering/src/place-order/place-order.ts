import { Command } from '@nestjs/cqrs';
import { HeldOrder } from '../order';

export class PlaceOrder extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly order: HeldOrder,
    readonly receivedAt: string,
  ) { super(); }
}
