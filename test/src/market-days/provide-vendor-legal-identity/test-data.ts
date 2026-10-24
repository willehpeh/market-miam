import { ProvideVendorLegalIdentity } from '@market-miam/market-days';

export class TestProvideVendorLegalIdentity {
  static valid(): ProvideVendorLegalIdentity {
    return new ProvideVendorLegalIdentity(
      'vendor-id',
      '73282932000074',
      'Marie Dupont',
      '12 rue des Halles, 92330 Sceaux',
      'contact@chez-marie.fr',
      '06 12 34 56 78',
      'assujetti',
      null,
      null,
      null,
      null,
      null,
      null,
    );
  }

  static with(overrides: Partial<ProvideVendorLegalIdentity>): ProvideVendorLegalIdentity {
    const defaults = { ...this.valid(), ...overrides };
    return new ProvideVendorLegalIdentity(
      defaults.vendorId,
      defaults.siret,
      defaults.legalName,
      defaults.address,
      defaults.contactEmail,
      defaults.phone,
      defaults.vatRegime,
      defaults.mediatorName,
      defaults.mediatorUrl,
      defaults.legalForm,
      defaults.shareCapital,
      defaults.registryCity,
      defaults.legalRepresentative,
    );
  }
}
