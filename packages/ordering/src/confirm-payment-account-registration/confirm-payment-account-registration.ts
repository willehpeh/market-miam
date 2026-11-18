import { Command } from '@nestjs/cqrs';

export class ConfirmPaymentAccountRegistration extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly registrationId: string,
    readonly accountId: string,
    readonly confirmedAt: string,
  ) { super(); }
}
