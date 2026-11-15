import { Command } from '@nestjs/cqrs';

export class StartPaymentAccountRegistration extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly registrationId: string,
    readonly accountToken: string,
    readonly startedAt: string,
  ) { super(); }
}
