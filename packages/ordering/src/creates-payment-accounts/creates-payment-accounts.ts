import { CheckpointedProcessor, Processor, StoredEvent } from '@market-miam/event-sourcing';
import { PaymentAccountRegistrationStarted } from '../merchant/events';
import { PaymentAccounts } from '../payment-accounts';

@CheckpointedProcessor('creates-payment-accounts')
export class CreatesPaymentAccounts implements Processor {
  constructor(private readonly accounts: PaymentAccounts) {}

  async handle(event: StoredEvent<PaymentAccountRegistrationStarted>): Promise<void> {
    await this.accounts.createFor(event.payload);
  }

  eventTypes(): string[] {
    return ['PaymentAccountRegistrationStarted'];
  }
}
