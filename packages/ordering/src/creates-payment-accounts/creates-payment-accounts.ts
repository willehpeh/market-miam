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

  async handle(event: StoredEvent<PaymentAccountRegistrationStarted>): Promise<void> {
    if ((await this.accounts.createFor(event.payload)) === 'refused') {
      await this.fail(event.payload);
    }
  }

  eventTypes(): string[] {
    return ['PaymentAccountRegistrationStarted'];
  }

  private fail({ vendorId, registrationId }: Registration): Promise<void> {
    return this.commands.execute(new FailPaymentAccountRegistration(vendorId, registrationId, this.clock.now().value()));
  }
}
