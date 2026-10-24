import { Email } from '@market-miam/common';
import { VendorLegalIdentityProvided } from './events';
import { Siret } from './siret';
import { CompanyDetails } from './company-details';
import { Mediator } from './mediator';
import { LegalName } from './legal-name';
import { BusinessAddress } from './business-address';
import { ContactPhone } from './contact-phone';
import { VatRegime } from './vat-regime';

type Details = {
  siret: Siret;
  legalName: LegalName;
  address: BusinessAddress;
  contactEmail: Email;
  phone: ContactPhone;
  vatRegime: VatRegime;
  mediator: Mediator;
  company: CompanyDetails;
};

export class LegalIdentity {
  constructor(private readonly _details: Details) {
  }

  providedBy(vendorId: string): VendorLegalIdentityProvided['payload'] {
    const { siret, legalName, address, contactEmail, phone, vatRegime, mediator, company } = this._details;
    return {
      vendorId,
      siret: siret.value(),
      siren: siret.siren(),
      vatNumber: vatRegime.vatNumberFor(siret),
      legalName: legalName.value(),
      address: address.value(),
      contactEmail: contactEmail.value(),
      phone: phone.value(),
      vatRegime: vatRegime.value(),
      ...mediator.recorded(),
      ...company.recorded(),
    };
  }
}
