import { Clock } from '@market-miam/common';
import { CheckpointedProcessor, CommandGateway, Processor, StoredEvent } from '@market-miam/event-sourcing';
import { VendorId } from '@market-miam/shared-kernel';
import { EraseVendor } from '../erase-vendor';
import { RecordVendorAccountOpened } from '../record-vendor-account-opened';
import { Vendors } from '../vendor';
import { VendorInvited } from '../vendor/events';
import { VendorAccounts } from '../vendor-accounts';

@CheckpointedProcessor('opens-vendor-accounts')
export class OpensVendorAccounts implements Processor {
  constructor(
    private readonly vendors: Vendors,
    private readonly accounts: VendorAccounts,
    private readonly commands: CommandGateway,
    private readonly clock: Clock,
  ) {}

  async handle(event: StoredEvent<VendorInvited>): Promise<void> {
    const { vendorId } = event.payload;
    const vendor = await this.vendors.forVendor(new VendorId(vendorId));
    if (vendor.isErased()) {
      return;
    }
    const opening = await this.accounts.openFor(event.payload);
    const now = this.clock.now().value();
    if (opening === 'open') {
      await this.commands.execute(new RecordVendorAccountOpened(vendorId, now));
    } else {
      // Any answer but open means this invitation can never become an account (ADR 0060).
      await this.commands.execute(new EraseVendor(vendorId, now));
    }
  }

  eventTypes(): string[] {
    return ['VendorInvited'];
  }
}
