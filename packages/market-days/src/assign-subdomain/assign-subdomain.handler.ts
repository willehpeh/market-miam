import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Instant } from '@market-miam/common';
import { UnitOfWork } from '@market-miam/event-sourcing';
import { VendorId } from '@market-miam/shared-kernel';
import { AssignSubdomain } from './assign-subdomain';
import { Vendors } from '../vendor';
import { SubdomainRegistry } from '../subdomain-registry';

// The name is claimed in the registry and recorded on the vendor's stream in one
// transaction: a name taken fails the claim and records nothing, and an append that fails
// gives the name back (ADR 0065).
@CommandHandler(AssignSubdomain)
export class AssignSubdomainHandler implements ICommandHandler<AssignSubdomain> {
  constructor(
    private readonly vendors: Vendors,
    private readonly registry: SubdomainRegistry,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(command: AssignSubdomain): Promise<void> {
    await this.unitOfWork.transaction(async () => {
      const vendorId = new VendorId(command.vendorId);
      const vendor = await this.vendors.forVendor(vendorId);
      vendor.assignSubdomain(command.subdomain, new Instant(command.assignedAt));
      await this.registry.register(command.subdomain, command.vendorId);
      await this.vendors.save(vendor, vendorId);
    });
  }
}
