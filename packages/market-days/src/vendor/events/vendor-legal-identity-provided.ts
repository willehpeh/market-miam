import { DomainEvent } from '@market-miam/event-sourcing';

export type VendorLegalIdentityProvided = DomainEvent<'VendorLegalIdentityProvided', {
  vendorId: string;
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
}>
