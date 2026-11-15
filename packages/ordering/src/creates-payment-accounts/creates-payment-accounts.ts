import { Clock } from '@market-miam/common';
import { CheckpointedProcessor, CommandGateway, Processor, StoredEvent } from '@market-miam/event-sourcing';
import { FailPaymentAccountRegistration } from '../fail-payment-account-registration';
import { PaymentAccountRegistrationStarted } from '../merchant/events';
import { PaymentAccounts } from '../payment-accounts';

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
    if ((await this.accounts.createFor(event.payload)) === 'refused') {
      await this.commands.execute(new FailPaymentAccountRegistration(vendorId, registrationId, this.clock.now().value()));
    }
  }

  eventTypes(): string[] {
    return ['PaymentAccountRegistrationStarted'];
  }
}
