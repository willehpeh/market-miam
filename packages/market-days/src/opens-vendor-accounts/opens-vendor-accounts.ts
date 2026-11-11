import { CheckpointedProcessor, Processor, StoredEvent } from '@market-miam/event-sourcing';
import { VendorInvited } from '../vendor/events';
import { VendorAccounts } from '../vendor-accounts';

@CheckpointedProcessor('opens-vendor-accounts')
export class OpensVendorAccounts implements Processor {
  constructor(private readonly accounts: VendorAccounts) {}

  async handle(event: StoredEvent<VendorInvited>): Promise<void> {
    await this.accounts.openFor(event.payload);
  }

  eventTypes(): string[] {
    return ['VendorInvited'];
  }
}
