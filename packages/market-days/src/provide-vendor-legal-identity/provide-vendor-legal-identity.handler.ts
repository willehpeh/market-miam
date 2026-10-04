import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VendorId } from '@market-miam/shared-kernel';
import { Email } from '@market-miam/common';
import { ProvideVendorLegalIdentity } from './provide-vendor-legal-identity';
import { BusinessAddress, CompanyDetails, ContactPhone, LegalIdentity, LegalName, Mediator, Siret, VatRegime, Vendors } from '../vendor';

@CommandHandler(ProvideVendorLegalIdentity)
export class ProvideVendorLegalIdentityHandler implements ICommandHandler<ProvideVendorLegalIdentity> {
  constructor(private readonly vendors: Vendors) {
  }

  async execute(command: ProvideVendorLegalIdentity): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const vendor = await this.vendors.forVendor(vendorId);
    vendor.provideLegalIdentity(new LegalIdentity({
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
