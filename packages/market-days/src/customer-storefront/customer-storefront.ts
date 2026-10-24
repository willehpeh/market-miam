import { CatalogueViewItem } from '../catalogue-view/catalogue-view';

export type UpcomingMarket = {
  date: string;
  weekday: string;
  marketName: string;
  startTime?: string;
  endTime?: string;
  street?: string;
  postalCode: string;
  town: string;
  pitch?: string;
  cancelled: boolean;
  // The market is happening right now — the "En cours" badge. Never true for a
  // cancelled day.
  inProgress: boolean;
  // The day's menu, joined from the catalogue upstream; empty when nothing is planned
  // or the day is cancelled.
  items: CatalogueViewItem[];
  // Which of those items sold out during service — the customer card greys them in place.
  soldOutItemIds: string[];
};

// The vendor as éditeur of their storefront (LCEN art. 6-III-1 and 19, ADR 0054), with
// what the page derives already applied: who directs publication, and which lines exist.
export type Editeur = {
  legalName: string;
  address: string;
  siret: string;
  contactEmail: string;
  phone: string;
  // The représentant légal of a société; for a sole trader, the vendor themself.
  publicationDirector: string;
  vatRegime: string;
  // Null under the franchise en base: the page says "TVA non applicable" instead.
  vatNumber: string | null;
  // Only a société has a capital and an RCS registration.
  company: { legalForm: string; shareCapital: string; registryCity: string; siren: string } | null;
  mediator: { name: string; url: string } | null;
};

export type CustomerStorefront =
  | {
      status: 'published';
      name: string;
      description: string;
      phone: string;
      coverPhoto: string | null;
      items: CatalogueViewItem[];
      // Whether the carte draws the prices it is carrying. The vendor's choice, opted in
      // by default; every price stays in the payload either way, and the featured market
      // card is not governed by it — that figure is the market's, not the carte's.
      cartePricesVisible: boolean;
      upcomingMarkets: UpcomingMarket[];
      // Null until the vendor provides their legal identity.
      editeur: Editeur | null;
    }
  | {
      status: 'coming-soon';
      name: string | null;
    };
