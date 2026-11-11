import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Email, Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { InviteVendor } from './invite-vendor';
import { Vendors } from '../vendor';

@CommandHandler(InviteVendor)
export class InviteVendorHandler implements ICommandHandler<InviteVendor> {
  constructor(private readonly vendors: Vendors) {
  }

  async execute(request: InviteVendor): Promise<void> {
    const vendorId = new VendorId(request.vendorId);
    const vendor = await this.vendors.forVendor(vendorId);
    vendor.invite(new Instant(request.invitedAt), new Email(request.email));
    await this.vendors.save(vendor, vendorId);
  }
}
