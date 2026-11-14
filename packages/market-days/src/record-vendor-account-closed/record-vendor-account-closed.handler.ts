import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { RecordVendorAccountClosed } from './record-vendor-account-closed';
import { Vendors } from '../vendor';

@CommandHandler(RecordVendorAccountClosed)
export class RecordVendorAccountClosedHandler implements ICommandHandler<RecordVendorAccountClosed> {
  constructor(private readonly vendors: Vendors) {
  }

  async execute(command: RecordVendorAccountClosed): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const vendor = await this.vendors.forVendor(vendorId);
    vendor.recordAccountClosed(new Instant(command.closedAt));
    await this.vendors.save(vendor, vendorId);
  }
}
