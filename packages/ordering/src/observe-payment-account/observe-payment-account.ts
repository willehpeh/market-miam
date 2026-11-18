import { Command } from '@nestjs/cqrs';
import { CardPayments } from '../merchant/card-payments';

export class ObservePaymentAccount extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly registrationId: string,
    readonly accountId: string,
    readonly cardPayments: CardPayments,
    readonly observedAt: string,
    readonly informationDueBy?: string,
  ) { super(); }
}
