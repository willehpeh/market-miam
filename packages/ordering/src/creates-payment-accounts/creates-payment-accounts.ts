import { Clock } from '@market-miam/common';
import { CheckpointedProcessor, CommandGateway, Processor, StoredEvent } from '@market-miam/event-sourcing';
import { FailPaymentAccountRegistration } from '../fail-payment-account-registration';
import { PaymentAccountRegistrationStarted } from '../merchant/events';
import { PaymentAccounts, Registration } from '../payment-accounts';

@CheckpointedProcessor('creates-payment-accounts')
export class CreatesPaymentAccounts implements Processor {
  constructor(
    private readonly accounts: PaymentAccounts,
    private readonly commands: CommandGateway,
    private readonly clock: Clock,
  ) {}

  // On success it writes nothing: Stripe's notice confirms the account (board, R2). A refusal is
  // known only here, so this is where it is recorded.
  async handle(event: StoredEvent<PaymentAccountRegistrationStarted>): Promise<void> {
    const { vendorId, registrationId } = event.payload;
    if (await this.refused(event.payload)) {
      await this.commands.execute(new FailPaymentAccountRegistration(vendorId, registrationId, this.clock.now().value()));
    }
  }

  // Only Stripe's final answers refuse. A token error is final only once no account was created for
  // the registration: a lost success retried past the token's hour answers it too (ADR 0068).
  private async refused(registration: Registration): Promise<boolean> {
    switch (await this.accounts.createFor(registration)) {
      case 'created':
        return false;
      case 'refused':
        return true;
      case 'token-unusable':
        return !(await this.accounts.wasCreatedFor(registration));
    }
  }

  eventTypes(): string[] {
    return ['PaymentAccountRegistrationStarted'];
  }
}
