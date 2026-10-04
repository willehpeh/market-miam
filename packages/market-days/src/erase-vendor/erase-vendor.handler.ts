import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { EraseVendor } from './erase-vendor';
import { Vendors } from '../vendor';

@CommandHandler(EraseVendor)
export class EraseVendorHandler implements ICommandHandler<EraseVendor> {
  constructor(private readonly vendors: Vendors) {
  }

  async execute(command: EraseVendor): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const vendor = await this.vendors.forVendor(vendorId);
    vendor.erase(new Instant(command.erasedAt));
    await this.vendors.save(vendor, vendorId);
  }
}
