import { Clock } from '@market-miam/common';
import { CheckpointedProcessor, CommandGateway, Processor, StoredEvent } from '@market-miam/event-sourcing';
import { EraseVendor } from '../erase-vendor';
import { VendorInvited } from '../vendor/events';
import { VendorAccounts } from '../vendor-accounts';

@CheckpointedProcessor('opens-vendor-accounts')
export class OpensVendorAccounts implements Processor {
  constructor(
    private readonly accounts: VendorAccounts,
    private readonly commands: CommandGateway,
    private readonly clock: Clock,
  ) {}

  async handle(event: StoredEvent<VendorInvited>): Promise<void> {
    const opening = await this.accounts.openFor(event.payload);
    if (opening === 'email-in-use') {
      await this.commands.execute(new EraseVendor(event.payload.vendorId, this.clock.now().value()));
    }
  }

  eventTypes(): string[] {
    return ['VendorInvited'];
  }
}
