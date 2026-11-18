import { Clock } from '@market-miam/common';
import { CheckpointedProcessor, CommandGateway, Processor, StoredEvent } from '@market-miam/event-sourcing';
import { ConfirmPaymentAccountRegistration } from '../confirm-payment-account-registration';
import { PaymentAccountUpdateDetected } from '../payment-account-notices';
import { PaymentAccounts } from '../payment-accounts';

@CheckpointedProcessor('checks-payment-accounts')
export class ChecksPaymentAccounts implements Processor {
  constructor(
    private readonly accounts: PaymentAccounts,
    private readonly commands: CommandGateway,
    private readonly clock: Clock,
  ) {}

  async handle(event: StoredEvent<PaymentAccountUpdateDetected>): Promise<void> {
    const account = await this.accounts.find(event.payload.accountId);
    if (account) {
      await this.commands.execute(
        new ConfirmPaymentAccountRegistration(account.vendorId, account.registrationId, account.accountId, this.clock.now().value()),
      );
    }
  }

  eventTypes(): string[] {
    return ['PaymentAccountUpdateDetected'];
  }
}
