import { Email } from '@market-miam/common';
import { VendorLegalIdentityRecorded } from './events';
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

  // Compared against the event as it was recorded, field by field: the snapshot is held raw
  // because shreddable fields are not re-validated (ADR 0057), and jsonb keeps no key order.
  sameAs(recorded: VendorLegalIdentityRecorded['payload']): boolean {
    const mine = this.recordedFor(recorded.vendorId);
    return (Object.keys(mine) as (keyof typeof mine)[]).every((field) => mine[field] === recorded[field]);
  }

  recordedFor(vendorId: string): VendorLegalIdentityRecorded['payload'] {
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
