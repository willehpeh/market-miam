import { Command } from '@nestjs/cqrs';

export class FailPaymentAccountRegistration extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly registrationId: string,
    readonly failedAt: string,
  ) { super(); }
}
