import { UpcomingMarket } from './markets/upcoming-market';
import { CatalogueItem } from './items/catalogue-item';

export type CustomerStorefront = PublishedCustomerStorefront | ComingSoonCustomerStorefront;

// The vendor as éditeur of their storefront (LCEN art. 6-III-1 and 19, ADR 0054), as the API
// derives it: who directs publication, and which lines exist.
export type Editeur = {
  legalName: string;
  address: string;
  siret: string;
  contactEmail: string;
  phone: string;
  publicationDirector: string;
  vatRegime: string;
  // Null under the franchise en base.
  vatNumber: string | null;
  company: { legalForm: string; shareCapital: string; registryCity: string; siren: string } | null;
  mediator: { name: string; url: string } | null;
};

export type PublishedCustomerStorefront = {
  status: 'published';
  name: string;
  description: string;
  phone: string;
  coverPhoto: string | null;
  items: CatalogueItem[];
  // Whether the carte quotes its prices — the vendor's choice, opted in by default. Every
  // price is carried either way; this says only whether the carte draws them.
  cartePricesVisible: boolean;
  upcomingMarkets: UpcomingMarket[];
  // Null until the vendor provides their legal identity.
  editeur: Editeur | null;
};

export type ComingSoonCustomerStorefront = {
  status: 'coming-soon';
  name: string | null;
};
