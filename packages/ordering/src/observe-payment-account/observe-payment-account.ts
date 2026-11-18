import { Command } from '@nestjs/cqrs';
import { ObservedAccount } from '../merchant/observed-account';

export class ObservePaymentAccount extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly account: ObservedAccount,
    readonly observedAt: string,
  ) { super(); }
}
