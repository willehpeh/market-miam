import { CheckpointedProcessor, Processor, StoredEvent } from '@market-miam/event-sourcing';
import { VendorErased } from '../vendor/events';
import { VendorAccounts } from '../vendor-accounts';

@CheckpointedProcessor('closes-vendor-accounts')
export class ClosesVendorAccounts implements Processor {
  constructor(private readonly accounts: VendorAccounts) {}

  async handle(event: StoredEvent<VendorErased>): Promise<void> {
    await this.accounts.closeFor(event.payload.vendorId);
  }

  eventTypes(): string[] {
    return ['VendorErased'];
  }
}
