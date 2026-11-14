import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { RecordVendorAccountOpened } from './record-vendor-account-opened';
import { Vendors } from '../vendor';

@CommandHandler(RecordVendorAccountOpened)
export class RecordVendorAccountOpenedHandler implements ICommandHandler<RecordVendorAccountOpened> {
  constructor(private readonly vendors: Vendors) {
  }

  async execute(command: RecordVendorAccountOpened): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const vendor = await this.vendors.forVendor(vendorId);
    vendor.recordAccountOpened(new Instant(command.openedAt));
    await this.vendors.save(vendor, vendorId);
  }
}
