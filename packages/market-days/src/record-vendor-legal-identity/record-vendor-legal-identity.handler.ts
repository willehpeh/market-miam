import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VendorId } from '@market-miam/shared-kernel';
import { Email } from '@market-miam/common';
import { RecordVendorLegalIdentity } from './record-vendor-legal-identity';
import { BusinessAddress, CompanyDetails, ContactPhone, LegalIdentity, LegalName, Mediator, Siret, VatRegime, Vendors } from '../vendor';

@CommandHandler(RecordVendorLegalIdentity)
export class RecordVendorLegalIdentityHandler implements ICommandHandler<RecordVendorLegalIdentity> {
  constructor(private readonly vendors: Vendors) {
  }

  async execute(command: RecordVendorLegalIdentity): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const vendor = await this.vendors.forVendor(vendorId);
    vendor.recordLegalIdentity(new LegalIdentity({
      siret: new Siret(command.siret),
      legalName: new LegalName(command.legalName),
      address: new BusinessAddress(command.address),
      contactEmail: new Email(command.contactEmail),
      phone: new ContactPhone(command.phone),
      vatRegime: new VatRegime(command.vatRegime),
      mediator: new Mediator(command.mediatorName, command.mediatorUrl),
      company: new CompanyDetails({
        legalForm: command.legalForm,
        shareCapital: command.shareCapital,
        registryCity: command.registryCity,
        legalRepresentative: command.legalRepresentative,
      }),
    }));
    await this.vendors.save(vendor, vendorId);
  }
}
