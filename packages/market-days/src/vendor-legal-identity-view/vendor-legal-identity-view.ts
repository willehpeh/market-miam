// What the vendor provided, plus what the domain derived from it (SIREN, TVA number).
export type VendorLegalIdentityView = {
  siret: string;
  siren: string;
  vatNumber: string | null;
  legalName: string;
  address: string;
  contactEmail: string;
  phone: string;
  vatRegime: string;
  mediatorName: string | null;
  mediatorUrl: string | null;
  legalForm: string | null;
  shareCapital: string | null;
  registryCity: string | null;
  legalRepresentative: string | null;
};
