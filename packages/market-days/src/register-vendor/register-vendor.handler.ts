import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Email, Instant } from '@market-monster/common';
import { VendorId } from '@market-monster/shared-kernel';
import { RegisterVendor } from './register-vendor';
import { Vendors } from '../vendor';

@CommandHandler(RegisterVendor)
export class RegisterVendorHandler implements ICommandHandler<RegisterVendor> {
  constructor(private readonly vendors: Vendors) {
  }

  async execute(request: RegisterVendor): Promise<void> {
    const vendorId = new VendorId(request.vendorId);
    const vendor = await this.vendors.forVendor(vendorId);
    vendor.register(new Instant(request.registeredAt), new Email(request.email));
    await this.vendors.save(vendor, vendorId);
  }
}
