import { Clock } from '@market-miam/common';
import { CheckpointedProcessor, CommandGateway, Processor, StoredEvent } from '@market-miam/event-sourcing';
import { ObservePaymentAccount } from '../observe-payment-account';
import { PaymentAccountUpdateDetected } from '../payment-account-notices';
import { PaymentAccount, PaymentAccounts } from '../payment-accounts';

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
      await this.observe(account);
    }
  }

  eventTypes(): string[] {
    return ['PaymentAccountUpdateDetected'];
  }

  private observe({ vendorId, registrationId, accountId, cardPayments, informationDueBy }: PaymentAccount): Promise<void> {
    return this.commands.execute(
      new ObservePaymentAccount(vendorId, registrationId, accountId, cardPayments, this.clock.now().value(), informationDueBy),
    );
  }
}
