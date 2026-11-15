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
    if (await this.stripeRefusesForGood(event.payload)) {
      await this.fail(event.payload);
    }
  }

  eventTypes(): string[] {
    return ['PaymentAccountRegistrationStarted'];
  }

  private async stripeRefusesForGood(registration: Registration): Promise<boolean> {
    switch (await this.accounts.createFor(registration)) {
      case 'created':
        return false;
      case 'refused':
        return true;
      case 'token-unusable':
        return this.noAccountWasCreatedFor(registration);
    }
  }

  private async noAccountWasCreatedFor(registration: Registration): Promise<boolean> {
    return !(await this.accounts.wasCreatedFor(registration));
  }

  private fail({ vendorId, registrationId }: Registration): Promise<void> {
    return this.commands.execute(new FailPaymentAccountRegistration(vendorId, registrationId, this.clock.now().value()));
  }
}
