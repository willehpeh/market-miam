import { Clock } from '@market-miam/common';
import { CheckpointedProcessor, CommandGateway, Processor, StoredEvent } from '@market-miam/event-sourcing';
import { RecordVendorAccountClosed } from '../record-vendor-account-closed';
import { VendorErased } from '../vendor/events';
import { VendorAccounts } from '../vendor-accounts';

@CheckpointedProcessor('closes-vendor-accounts')
export class ClosesVendorAccounts implements Processor {
  constructor(
    private readonly accounts: VendorAccounts,
    private readonly commands: CommandGateway,
    private readonly clock: Clock,
  ) {}

  async handle(event: StoredEvent<VendorErased>): Promise<void> {
    await this.accounts.closeFor(event.payload);
    await this.commands.execute(new RecordVendorAccountClosed(event.payload.vendorId, this.clock.now().value()));
  }

  eventTypes(): string[] {
    return ['VendorErased'];
  }
}
